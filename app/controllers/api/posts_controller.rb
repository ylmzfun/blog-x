class Api::PostsController < Api::BaseController
  skip_before_action :authenticate_request, only: [ :index, :show ]
  before_action :authenticate_optional, only: [ :index, :show ]
  before_action :require_author!, only: [ :create, :update, :destroy ]
  before_action :set_post, only: [ :show, :update, :destroy, :pin ]

  def index
    posts = Post.published

    posts = posts.by_category(params[:categorySlug]) if params[:categorySlug].present?
    posts = posts.by_tag(params[:tagSlug]) if params[:tagSlug].present?
    posts = posts.where(pinned: true) if params[:pinned].present?

    if params[:status] == "draft" && current_user&.admin?
      posts = Post.drafts.where(author: current_user)
    end

    posts = case params[:sort]
    when "popular" then posts.popular
    else posts.pinned_first.latest
    end

    posts = posts.includes(:author, :category, :tags)
    render_paginated(posts, serializer: :as_list_json)
  end

  def show
    @post.increment_view!
    render json: { code: 0, message: "success", data: @post.as_detail_json }
  end

  def create
    post = current_user.posts.build(post_params)
    post.save!

    if params[:tagIds].present?
      tags = Tag.where(id: params[:tagIds])
      post.tags << tags
      tags.each(&:recalculate_post_count!)
    end
    post.category&.recalculate_post_count!

    render json: { code: 0, message: "success", data: post.as_detail_json }
  end

  def update
    unless @post.author_id == current_user.id || current_user.admin?
      return render json: { code: 403, message: "Forbidden" }
    end

    @post.update!(post_params)

    if params[:tagIds].present?
      @post.post_tags.destroy_all
      Tag.where(id: params[:tagIds]).each do |tag|
        @post.tags << tag unless @post.tags.include?(tag)
        tag.recalculate_post_count!
      end
    end

    render json: { code: 0, message: "success", data: @post.as_detail_json }
  end

  def destroy
    unless @post.author_id == current_user.id || current_user.admin?
      return render json: { code: 403, message: "Forbidden" }
    end
    @post.soft_delete!
    render json: { code: 0, message: "success" }
  end

  def drafts
    posts = current_user.posts.drafts.includes(:category, :tags).latest
    render_paginated(posts, serializer: :as_list_json)
  end

  def pin
    require_admin!
    @post.update!(pinned: !@post.pinned)
    render json: { code: 0, message: "success", data: @post.as_list_json }
  end

  private

  def set_post
    @post = if params[:slug].present?
              Post.find_by!(slug: params[:slug])
    else
              Post.find_by!(slug: params[:id])
    end
  end

  def post_params
    p = params.permit(:title, :slug, :content, :summary, :cover, :categoryId, :status)
    { title: p[:title], slug: p[:slug], content: p[:content], summary: p[:summary],
      cover: p[:cover], category_id: p[:categoryId], status: p[:status] }.compact
  end
end
