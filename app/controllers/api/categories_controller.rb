class Api::CategoriesController < Api::BaseController
  skip_before_action :authenticate_request, only: [:index, :show]
  before_action :require_admin!, only: [:create, :update, :destroy]
  before_action :set_category, only: [:show, :update, :destroy]

  def index
    categories = Category.all.order(:name).map do |c|
      c.post_count = Post.published.where(category_id: c.id).count
      c.as_json
    end
    render json: { code: 0, message: "success", data: categories }
  end

  def show
    render json: { code: 0, message: "success", data: @category.as_json }
  end

  def create
    category = Category.create!(category_params)
    render json: { code: 0, message: "success", data: category.as_json }
  end

  def update
    @category.update!(category_params)
    render json: { code: 0, message: "success", data: @category.as_json }
  end

  def destroy
    @category.destroy!
    render json: { code: 0, message: "success" }
  end

  private

  def set_category
    if params[:slug].present?
      @category = Category.find_by!(slug: params[:slug])
    else
      @category = Category.find(params[:id])
    end
  end

  def category_params
    params.permit(:name, :slug, :description)
  end
end
