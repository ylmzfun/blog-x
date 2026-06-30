class Api::AuthController < ActionController::API
  before_action :authenticate_request, only: [:logout]
  rescue_from ActiveRecord::RecordInvalid, with: :unprocessable_entity_error
  rescue_from ActiveRecord::RecordNotUnique, with: :conflict_error

  def register
    user = User.create!(register_params.merge(role: "user"))
    render json: {
      code: 0, message: "success",
      data: { id: user.id.to_s, username: user.username, email: user.email }
    }
  end

  def login
    user = User.find_by("email = ? OR username = ?", params[:email].to_s.downcase, params[:email])
    unless user&.authenticate(params[:password])
      return render json: { code: 401, message: "Invalid email or password" }
    end

    access_token = JsonWebToken.generate_access_token(user)
    refresh_token = JsonWebToken.generate_refresh_token
    user.update!(refresh_token: refresh_token)

    render json: {
      code: 0, message: "success",
      data: {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresIn: 7200,
        user: { id: user.id.to_s, username: user.username, avatar: user.avatar_url, role: user.role }
      }
    }
  end

  def logout
    current_user.update!(refresh_token: nil)
    render json: { code: 0, message: "success" }
  end

  def refresh
    user = User.find_by(refresh_token: params[:refreshToken])
    return render json: { code: 401, message: "Invalid refresh token" } unless user

    access_token = JsonWebToken.generate_access_token(user)
    render json: {
      code: 0, message: "success",
      data: { accessToken: access_token, expiresIn: 7200 }
    }
  end

  def forgot_password
    user = User.find_by(email: params[:email]&.downcase)
    if user
      user.update!(refresh_token: JsonWebToken.generate_refresh_token)
    end
    render json: { code: 0, message: "If the email exists, a reset link has been sent" }
  end

  def reset_password
    user = User.find_by(refresh_token: params[:token])
    return render json: { code: 400, message: "Invalid reset token" } unless user

    user.update!(password: params[:password], refresh_token: nil)
    render json: { code: 0, message: "Password reset successfully" }
  end

  private

  def register_params
    params.permit(:username, :email, :password)
  end

  def authenticate_request
    header = request.headers["Authorization"]
    token = header&.split(" ")&.last
    return render json: { code: 401, message: "Missing token" } unless token

    begin
      decoded = JsonWebToken.decode(token)
      @current_user = User.find_by(id: decoded[:user_id])
      render json: { code: 401, message: "User not found" } unless @current_user
    rescue JWT::ExpiredSignature, JWT::DecodeError => e
      render json: { code: 401, message: e.message }
    end
  end

  def current_user
    @current_user
  end

  def unprocessable_entity_error(exception)
    render json: { code: 400, message: exception.record.errors.full_messages.join(", ") }
  end

  def conflict_error
    render json: { code: 400, message: "Resource already exists" }
  end
end
