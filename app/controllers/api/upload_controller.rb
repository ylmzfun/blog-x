class Api::UploadController < Api::BaseController
  def image
    blob = ActiveStorage::Blob.create_and_upload!(
      io: params[:file],
      filename: params[:file].original_filename,
      content_type: params[:file].content_type
    )
    url = Rails.application.routes.url_helpers.rails_blob_url(blob, only_path: true)
    render json: { code: 0, message: "success", data: { url: url, filename: blob.filename.to_s } }
  end

  def avatar
    current_user.avatar_image.attach(params[:file])
    url = current_user.avatar_url
    render json: { code: 0, message: "success", data: { url: url, filename: params[:file].original_filename } }
  end
end
