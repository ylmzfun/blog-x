class Api::BaseController < ActionController::API
  before_action :authenticate_request

  rescue_from ActiveRecord::RecordNotFound, with: :not_found
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity_error
  rescue_from JWT::ExpiredSignature, with: :unauthorized_error
  rescue_from JWT::DecodeError, with: :unauthorized_error
  rescue_from ActiveRecord::RecordNotUnique, with: :conflict_error

  private

  def authenticate_request
    header = request.headers["Authorization"]
    token = header&.split(" ")&.last

    if token
      begin
        decoded = JsonWebToken.decode(token)
        @current_user = User.find_by(id: decoded[:user_id])
        render_unauthorized("User not found") unless @current_user
      rescue JWT::ExpiredSignature, JWT::DecodeError => e
        render_unauthorized(e.message)
      end
    else
      render_unauthorized("Missing token")
    end
  end

  def current_user
    @current_user
  end

  def authenticate_optional
    header = request.headers["Authorization"]
    token = header&.split(" ")&.last
    return unless token

    begin
      decoded = JsonWebToken.decode(token)
      @current_user = User.find_by(id: decoded[:user_id])
    rescue JWT::ExpiredSignature, JWT::DecodeError
      nil
    end
  end

  def require_admin!
    render_forbidden unless current_user&.admin?
  end

  def require_author!
    render_forbidden unless current_user&.author?
  end

  def render_success(data = nil, message = "success")
    render json: { code: 0, message: message, data: data }.compact
  end

  def render_paginated(collection, serializer: nil)
    collection = collection.page(params[:page] || 1).per([(params[:pageSize] || 10).to_i, 50].min)
    data = {
      list: serializer ? collection.map(&serializer) : collection.map(&:as_json),
      total: collection.total_count,
      page: collection.current_page,
      pageSize: collection.limit_value
    }
    render json: { code: 0, message: "success", data: data }
  end

  def render_error(code, message, status = :ok)
    render json: { code: code, message: message }, status: status
  end

  def render_unauthorized(message = "Unauthorized")
    render_error(401, message)
  end

  def render_forbidden(message = "Forbidden")
    render_error(403, message)
  end

  def not_found
    render_error(404, "Resource not found")
  end

  def unprocessable_entity_error(exception)
    render_error(400, exception.record.errors.full_messages.join(", "))
  end

  def unauthorized_error(exception)
    render_error(401, exception.message)
  end

  def conflict_error
    render_error(400, "Resource already exists")
  end
end
