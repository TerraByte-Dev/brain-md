use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

// --- Types ---

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Thought {
    pub id: String,
    #[serde(rename = "type")]
    pub thought_type: String,
    pub title: String,
    pub summary: String,
    pub body: String,
    pub project: Option<String>,
    pub tags: Vec<String>,
    pub confidence: f64,
    pub ttl: String,
    pub source: String,
    pub created: String,
    pub modified: String,
    pub sensitive: bool,
}

#[derive(Debug, Serialize, Clone)]
pub struct BrainStatus {
    pub name: String,
    pub path: String,
    pub thought_count: usize,
    pub by_type: Vec<(String, usize)>,
}

#[derive(Debug, Serialize, Clone)]
pub struct TreeNode {
    pub label: String,
    pub node_type: String, // "folder" | "thought"
    pub thought_id: Option<String>,
    pub thought_type: Option<String>,
    pub count: usize,
    pub children: Vec<TreeNode>,
}

// --- State ---

pub struct BrainState {
    pub db_path: Mutex<Option<String>>,
}

fn get_conn(state: &State<BrainState>) -> Result<Connection, String> {
    let db_path = state.db_path.lock().unwrap();
    let path = db_path.as_ref().ok_or("Brain not connected")?;
    Connection::open(path).map_err(|e| format!("DB error: {}", e))
}

// --- Commands ---

#[tauri::command]
fn connect_brain(path: String, state: State<BrainState>) -> Result<BrainStatus, String> {
    let db_path = format!("{}/.brain/brain.db", path);
    let conn = Connection::open(&db_path).map_err(|e| format!("Cannot open brain.db: {}", e))?;

    // Read config
    let config_path = format!("{}/.brain/config.json", path);
    let config_str = std::fs::read_to_string(&config_path)
        .map_err(|e| format!("Cannot read config: {}", e))?;
    let config: serde_json::Value = serde_json::from_str(&config_str)
        .map_err(|e| format!("Invalid config: {}", e))?;
    let name = config["name"].as_str().unwrap_or("Unknown").to_string();

    // Count thoughts
    let count: usize = conn
        .query_row("SELECT COUNT(*) FROM thoughts", [], |row| row.get(0))
        .map_err(|e| format!("Query error: {}", e))?;

    // Count by type
    let mut stmt = conn
        .prepare("SELECT type, COUNT(*) FROM thoughts GROUP BY type")
        .map_err(|e| format!("Query error: {}", e))?;
    let by_type: Vec<(String, usize)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    // Store connection path
    *state.db_path.lock().unwrap() = Some(db_path);

    Ok(BrainStatus {
        name,
        path,
        thought_count: count,
        by_type,
    })
}

#[tauri::command]
fn list_thoughts(state: State<BrainState>) -> Result<Vec<Thought>, String> {
    let conn = get_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, type, title, summary, body, project, tags, confidence, ttl, source, created, modified, sensitive FROM thoughts ORDER BY modified DESC")
        .map_err(|e| format!("Query error: {}", e))?;

    let thoughts: Vec<Thought> = stmt
        .query_map([], |row| {
            let tags_str: String = row.get(6)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let sensitive: i32 = row.get(12)?;
            Ok(Thought {
                id: row.get(0)?,
                thought_type: row.get(1)?,
                title: row.get(2)?,
                summary: row.get(3)?,
                body: row.get(4)?,
                project: row.get(5)?,
                tags,
                confidence: row.get(7)?,
                ttl: row.get(8)?,
                source: row.get(9)?,
                created: row.get(10)?,
                modified: row.get(11)?,
                sensitive: sensitive != 0,
            })
        })
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(thoughts)
}

#[tauri::command]
fn get_thought(id: String, state: State<BrainState>) -> Result<Thought, String> {
    let conn = get_conn(&state)?;
    conn.query_row(
        "SELECT id, type, title, summary, body, project, tags, confidence, ttl, source, created, modified, sensitive FROM thoughts WHERE id = ?1",
        params![id],
        |row| {
            let tags_str: String = row.get(6)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let sensitive: i32 = row.get(12)?;
            Ok(Thought {
                id: row.get(0)?,
                thought_type: row.get(1)?,
                title: row.get(2)?,
                summary: row.get(3)?,
                body: row.get(4)?,
                project: row.get(5)?,
                tags,
                confidence: row.get(7)?,
                ttl: row.get(8)?,
                source: row.get(9)?,
                created: row.get(10)?,
                modified: row.get(11)?,
                sensitive: sensitive != 0,
            })
        },
    )
    .map_err(|e| format!("Thought not found: {}", e))
}

#[tauri::command]
fn search_thoughts(query: String, state: State<BrainState>) -> Result<Vec<Thought>, String> {
    let conn = get_conn(&state)?;
    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.type, t.title, t.summary, t.body, t.project, t.tags, t.confidence, t.ttl, t.source, t.created, t.modified, t.sensitive \
             FROM thoughts_fts fts \
             JOIN thoughts t ON t.rowid = fts.rowid \
             WHERE thoughts_fts MATCH ?1 \
             ORDER BY rank \
             LIMIT 20",
        )
        .map_err(|e| format!("Query error: {}", e))?;

    let thoughts: Vec<Thought> = stmt
        .query_map(params![query], |row| {
            let tags_str: String = row.get(6)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let sensitive: i32 = row.get(12)?;
            Ok(Thought {
                id: row.get(0)?,
                thought_type: row.get(1)?,
                title: row.get(2)?,
                summary: row.get(3)?,
                body: row.get(4)?,
                project: row.get(5)?,
                tags,
                confidence: row.get(7)?,
                ttl: row.get(8)?,
                source: row.get(9)?,
                created: row.get(10)?,
                modified: row.get(11)?,
                sensitive: sensitive != 0,
            })
        })
        .map_err(|e| format!("Search error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(thoughts)
}

#[tauri::command]
fn get_tree(state: State<BrainState>) -> Result<Vec<TreeNode>, String> {
    let conn = get_conn(&state)?;
    let mut stmt = conn
        .prepare("SELECT id, type, title, project, modified FROM thoughts ORDER BY modified DESC")
        .map_err(|e| format!("Query error: {}", e))?;

    let rows: Vec<(String, String, String, Option<String>, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?)))
        .map_err(|e| format!("Query error: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    // Build tree: Projects section + Global types section
    let mut projects: std::collections::BTreeMap<String, Vec<TreeNode>> = std::collections::BTreeMap::new();
    let mut globals: std::collections::BTreeMap<String, Vec<TreeNode>> = std::collections::BTreeMap::new();

    for (id, thought_type, title, project, _modified) in &rows {
        let node = TreeNode {
            label: title.clone(),
            node_type: "thought".to_string(),
            thought_id: Some(id.clone()),
            thought_type: Some(thought_type.clone()),
            count: 0,
            children: vec![],
        };

        if let Some(proj) = project {
            projects.entry(proj.clone()).or_default().push(node);
        } else {
            globals.entry(thought_type.clone()).or_default().push(node);
        }
    }

    let mut tree: Vec<TreeNode> = vec![];

    // Projects
    if !projects.is_empty() {
        let project_children: Vec<TreeNode> = projects
            .into_iter()
            .map(|(name, children)| TreeNode {
                label: name,
                node_type: "folder".to_string(),
                thought_id: None,
                thought_type: None,
                count: children.len(),
                children,
            })
            .collect();
        tree.push(TreeNode {
            label: "Projects".to_string(),
            node_type: "folder".to_string(),
            thought_id: None,
            thought_type: None,
            count: project_children.iter().map(|c| c.count).sum(),
            children: project_children,
        });
    }

    // Global types
    let type_labels: std::collections::HashMap<&str, &str> = [
        ("user", "User"),
        ("context", "Context"),
        ("decision", "Decisions"),
        ("learning", "Learnings"),
        ("reference", "References"),
    ]
    .into_iter()
    .collect();

    for (type_key, label) in &[("user", "User"), ("decision", "Decisions"), ("learning", "Learnings"), ("context", "Context"), ("reference", "References")] {
        if let Some(children) = globals.remove(*type_key) {
            tree.push(TreeNode {
                label: label.to_string(),
                node_type: "folder".to_string(),
                thought_id: None,
                thought_type: Some(type_key.to_string()),
                count: children.len(),
                children,
            });
        }
    }

    Ok(tree)
}

#[tauri::command]
fn forget_thought(id: String, state: State<BrainState>) -> Result<(), String> {
    let conn = get_conn(&state)?;
    conn.execute("DELETE FROM links WHERE from_id = ?1 OR to_id = ?1", params![id])
        .map_err(|e| format!("Delete links error: {}", e))?;
    conn.execute("DELETE FROM thoughts WHERE id = ?1", params![id])
        .map_err(|e| format!("Delete error: {}", e))?;
    Ok(())
}

#[tauri::command]
fn pick_brain_folder() -> Result<Option<String>, String> {
    use std::process::Command;
    // Use PowerShell to open a native folder picker dialog
    let output = Command::new("powershell")
        .args([
            "-NoProfile", "-Command",
            "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select a Brain folder'; $f.ShowNewFolderButton = $false; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath } else { '' }"
        ])
        .output()
        .map_err(|e| format!("Failed to open folder dialog: {}", e))?;

    let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if path.is_empty() {
        Ok(None)
    } else {
        // Verify it has a .brain/ directory
        let brain_dir = format!("{}/.brain", path);
        if !std::path::Path::new(&brain_dir).exists() {
            return Err(format!("No .brain/ directory found in {}. Select a folder containing an initialized Brain.", path));
        }
        Ok(Some(path))
    }
}

// --- Entry ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(BrainState {
            db_path: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            connect_brain,
            list_thoughts,
            get_thought,
            search_thoughts,
            get_tree,
            forget_thought,
            pick_brain_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
