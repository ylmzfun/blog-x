class Api::UsersController < Api::BaseController
  skip_before_action :authenticate_request, only: [:show]

  def me
    render json: { code: 0, message: "success", data: current_user.as_private_json }
  end

  def update
    current_user.update!(user_update_params)
    render json: { code: 0, message: "success", data: current_user.as_private_json }
  end

  def update_password
    unless current_user.authenticate(params[:oldPassword])
      return render json: { code: 400, message: "Old password is incorrect" }
    end
    current_user.update!(password: params[:newPassword])
    render json: { code: 0, message: "Password updated successfully" }
  end

  def show
    user = User.find(params[:id])
    render json: { code: 0, message: "success", data: user.as_public_json }
  end

  private

  def user_update_params
    params.permit(:username, :avatar, :bio, :website)
  end
end
