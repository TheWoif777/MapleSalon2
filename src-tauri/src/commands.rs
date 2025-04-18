use crate::{handlers, models, utils, AppStore, Error, Result};
use serde_json::{to_string, Map, Value};
use tauri::{command, ipc, AppHandle, Runtime, State, Window};
use wz_reader::{util::node_util, version::WzMapleVersion, WzNodeCast};

#[command]
pub(crate) async fn get_server_url<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, AppStore>,
) -> Result<Value> {
    let mut map = Map::new();
    let root = state.node.read().unwrap();
    map.insert(
        "url".to_string(),
        Value::String(format!("http://localhost:{}", state.port)),
    );
    map.insert("is_initialized".to_string(), Value::Bool(!root.is_null()));
    map.insert(
        "is_load_items".to_string(),
        Value::Bool(
            root.at("Item")
                .and_then(|e| Some(e.read().unwrap().children.len() > 0))
                == Some(true),
        ),
    );
    let patch_version = root.try_as_file().map(|f| f.wz_file_meta.patch_version);
    map.insert(
        "patch_version".to_string(),
        patch_version.map_or(Value::Null, |v| Value::Number(v.into())),
    );
    Ok(Value::Object(map))
}

#[command]
pub(crate) async fn init<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, AppStore>,
    path: String,
    version: Option<String>,
) -> Result<i32> {
    let current_root_path = state
        .node
        .read()
        .unwrap()
        .try_as_file()
        .map(|f| f.wz_file_meta.path.clone());

    if let Some(current_root_path) = current_root_path {
        if current_root_path == path {
            return Ok(0);
        }
    }

    let version = version.map(|s| match s.as_str() {
        "GMS" => WzMapleVersion::GMS,
        "EMS" => WzMapleVersion::EMS,
        "BMS" => WzMapleVersion::BMS,
        _ => WzMapleVersion::UNKNOWN,
    });

    let base_node = utils::resolve_base(&path, version)
        .await
        .map_err(|_| crate::Error::InitWzFailed)?;

    state.replace_root(&base_node);

    let version = state
        .node
        .read()
        .unwrap()
        .try_as_file()
        .map(|f| f.wz_file_meta.patch_version)
        .unwrap_or(0);

    Ok(version)
}

#[command]
pub(crate) async fn parse_node<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, AppStore>,
    path: String,
) -> Result<()> {
    let node_read = state.node.read().unwrap();

    let _ = node_read
        .at_path(&path)
        .map(|n| node_util::parse_node(&n))
        .ok_or(Error::NodeNotFound)?;

    Ok(())
}

#[command]
pub(crate) async fn unparse_node<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, AppStore>,
    path: String,
) -> Result<()> {
    let node = state.node.read().unwrap();

    node.at_path(&path)
        .map(|n| n.write().unwrap().unparse())
        .ok_or(Error::NodeNotFound)?;

    Ok(())
}

#[command]
pub(crate) async fn get_node_info<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, AppStore>,
    path: String,
) -> Result<models::NodeInfo> {
    let node = if path.is_empty() {
        state.node.clone()
    } else {
        state
            .node
            .read()
            .unwrap()
            .at_path(&path)
            .ok_or(Error::NodeNotFound)?
    };

    let node_read = node.read().unwrap();

    Ok(models::NodeInfo {
        name: node_read.name.to_string(),
        _type: to_string(&node_read.object_type)?,
        has_child: !node_read.children.is_empty(),
    })
}

#[command]
pub(crate) async fn get_childs_info<R: Runtime>(
    _app: AppHandle<R>,
    _window: Window<R>,
    state: State<'_, AppStore>,
    path: String,
) -> Result<Vec<models::NodeInfo>> {
    let node = if path.is_empty() {
        state.node.clone()
    } else {
        state
            .node
            .read()
            .unwrap()
            .at_path(&path)
            .ok_or(Error::NodeNotFound)?
    };

    let node_read = node.read().unwrap();

    Ok(node_read
        .children
        .values()
        .map(|node| {
            let node_read = node.read().unwrap();
            models::NodeInfo {
                name: node_read.name.to_string(),
                _type: to_string(&node_read.object_type).unwrap(),
                has_child: !node_read.children.is_empty(),
            }
        })
        .collect())
}

#[command]
pub(crate) fn encode_webp(request: ipc::Request) -> ipc::Response {
    let ipc::InvokeBody::Raw(webp_data) = request.body() else {
        return ipc::Response::new(vec![]);
    };
    let data = handlers::webp::encode_wep_animation(&webp_data);
    if let Ok(data) = data {
        ipc::Response::new(data.to_vec())
    } else {
        ipc::Response::new(vec![])
    }
}

// #[command]
// pub(crate) async fn search_by_equip_name<R: Runtime>(
//     _app: AppHandle<R>,
//     _window: Window<R>,
//     state: State<'_, AppStore>,
//     name: String,
//     _category: Option<String>,
// ) -> Result<Vec<(String, String)>> {
//     let equip_node = handlers::get_equip_string(&state.node)?;

//     let node = equip_node
//         .read()
//         .unwrap()
//         .at("Eqp")
//         .ok_or(Error::NodeNotFound)?;

//     if let Ok(ref mut string_read) = state.string.write() {
//         if string_read.len() == 0 {
//             string_read.extend(handlers::resolve_equip_string(&state.node, &node, false)?);
//         }
//     }

//     let string_dict = state.string.read().unwrap();

//     Ok(string_dict
//         .iter()
//         .filter_map(|(_, id, text, _, _, _, _)| {
//             if text.contains(&name) {
//                 Some((id.clone(), text.clone()))
//             } else {
//                 None
//             }
//         })
//         .collect())
// }
