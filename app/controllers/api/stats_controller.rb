class Api::StatsController < Api::BaseController
  before_action :require_admin!

  def overview
    today_start = Time.current.beginning_of_day
    render json: {
      code: 0, message: "success",
      data: {
        totalPosts: Post.published.count,
        totalComments: Comment.approved.active.count,
        totalUsers: User.count,
        todayPV: 0,
        todayUV: 0
      }
    }
  end

  def top_posts
    posts = Post.published.order(view_count: :desc).limit(10).map do |p|
      { id: p.id.to_s, title: p.title, slug: p.slug, viewCount: p.view_count }
    end
    render json: { code: 0, message: "success", data: posts }
  end
end
