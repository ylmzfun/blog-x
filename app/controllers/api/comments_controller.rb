class Api::CommentsController < Api::BaseController
  skip_before_action :authenticate_request, only: [ :index ]
  before_action :set_post, only: [ :index, :create ]
  before_action :set_comment, only: [ :destroy, :approve ]

  def index
    comments = @post.comments.approved.active.roots
                    .includes(:author, replies: [ :author ])
                    .order(created_at: :desc)
                    .page(params[:page] || 1)
                    .per([ (params[:pageSize] || 20).to_i, 50 ].min)

    render json: {
      code: 0, message: "success",
      data: {
        list: comments.map(&:as_tree_json),
        total: comments.total_count,
        page: comments.current_page,
        pageSize: comments.limit_value
      }
    }
  end

  def create
    comment = @post.comments.build(comment_params)
    comment.author = current_user
    comment.status = "approved"
    comment.save!

    @post.update!(comment_count: @post.comments.approved.active.count)

    render json: { code: 0, message: "success", data: comment.as_tree_json }
  end

  def destroy
    unless @comment.author_id == current_user.id || current_user.admin?
      return render json: { code: 403, message: "Forbidden" }
    end
    @comment.soft_delete!
    render json: { code: 0, message: "success" }
  end

  def approve
    require_admin!
    @comment.update!(status: params[:status] || "approved")
    render json: { code: 0, message: "success", data: @comment.as_tree_json }
  end

  private

  def set_post
    @post = Post.find(params[:postId] || params[:post_id])
  end

  def set_comment
    @comment = Comment.find(params[:id])
  end

  def comment_params
    p = params.permit(:content, :parentId)
    { content: p[:content], parent_id: p[:parentId] }.compact
  end
end
