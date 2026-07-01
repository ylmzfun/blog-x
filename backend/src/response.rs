use serde::Serialize;
use salvo::prelude::*;

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub code: i32,
    pub message: String,
    pub data: T,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageData<T: Serialize> {
    pub list: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

pub fn ok<T: Serialize>(data: T) -> Json<ApiResponse<T>> {
    Json(ApiResponse { code: 0, message: "success".into(), data })
}

pub fn err<T: Serialize>(code: i32, message: &str, data: T) -> Json<ApiResponse<T>> {
    Json(ApiResponse { code, message: message.into(), data })
}
