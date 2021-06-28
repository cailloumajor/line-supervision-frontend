use std::fs;
use std::path::{Path, PathBuf};

use actix_files::NamedFile;
use actix_web::{get, middleware::Logger, web, App, HttpResponse, HttpServer, Responder};
use anyhow::{Context, Result};
use env_logger::Builder;
use log::LevelFilter;

use ui_config::{replace_env_vars, toml_to_json};

const DATA_DIR: &str = "config_data";
const CONFIG_FILE: &str = "config.toml";
const LOGO_FILE: &str = "logo.png";

fn file_path(file: &str) -> PathBuf {
    Path::new(DATA_DIR).join(file)
}
struct AppState {
    config_json: String,
}

#[get("/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().finish()
}

#[get("/config")]
async fn config(data: web::Data<AppState>) -> impl Responder {
    HttpResponse::Ok()
        .content_type("application/json")
        .body(&data.config_json)
}

#[get("/logo")]
async fn logo() -> actix_web::Result<NamedFile> {
    Ok(NamedFile::open(file_path(LOGO_FILE))?)
}

#[actix_web::main]
async fn main() -> Result<()> {
    Builder::new().filter_level(LevelFilter::Info).init();
    let template_path = &file_path(CONFIG_FILE);
    let raw_toml = fs::read_to_string(template_path)
        .with_context(|| format!("Failed reading {}", template_path.display()))?;
    let raw_json = toml_to_json(&raw_toml)
        .with_context(|| format!("failed to convert {} to JSON", template_path.display()))?;
    let config_json = replace_env_vars(&raw_json).with_context(|| {
        format!(
            "failed to expand environment variables after converting {} to JSON",
            template_path.display()
        )
    })?;
    let state = web::Data::new(AppState { config_json });

    HttpServer::new(move || {
        let logger = Logger::default();
        App::new()
            .app_data(state.clone())
            .wrap(logger)
            .service(health)
            .service(config)
            .service(logo)
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await?;

    Ok(())
}
