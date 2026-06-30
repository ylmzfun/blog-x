class Api::TagsController < Api::BaseController
  skip_before_action :authenticate_request, only: [:index]
  before_action :require_author!, only: [:create]
  before_action :require_admin!, only: [:destroy]
  before_action :set_tag, only: [:destroy]

  def index
    tags = Tag.all.order(:name).map do |t|
      t.post_count = Post.published.joins(:tags).where(tags: { id: t.id }).count
      t.as_json
    end
    render json: { code: 0, message: "success", data: tags }
  end

  def create
    tag = Tag.create!(tag_params)
    render json: { code: 0, message: "success", data: tag.as_json }
  end

  def destroy
    @tag.destroy!
    render json: { code: 0, message: "success" }
  end

  private

  def set_tag
    @tag = Tag.find(params[:id])
  end

  def tag_params
    params.permit(:name, :slug)
  end
end
