class Api::SearchController < Api::BaseController
  skip_before_action :authenticate_request

  def search
    q = params[:q].to_s.strip
    return render json: { code: 400, message: "Search query is required" } if q.blank?

    page = (params[:page] || 1).to_i
    page_size = [ (params[:pageSize] || 10).to_i, 50 ].min

    posts = Post.published.latest
    terms = q.split(/\s+/).reject(&:blank?)
    terms.each do |term|
      safe = sanitize_like(term)
      posts = posts.where("title LIKE ? OR content LIKE ?", "%#{safe}%", "%#{safe}%")
    end

    posts = posts.includes(:author).page(page).per(page_size)

    list = posts.map do |post|
      {
        id: post.id.to_s,
        title: post.title,
        slug: post.slug,
        highlight: highlight_match(post.summary || post.content, q),
        publishedAt: post.published_at&.iso8601
      }
    end

    render json: {
      code: 0, message: "success",
      data: { list: list, total: posts.total_count, page: posts.current_page, pageSize: posts.limit_value }
    }
  end

  def suggestions
    q = params[:q].to_s.strip
    return render json: { code: 0, message: "success", data: { suggestions: [] } } if q.blank?

    titles = Post.published
                 .where("title LIKE ?", "%#{sanitize_like(q)}%")
                 .limit(5)
                 .pluck(:title)

    render json: {
      code: 0, message: "success",
      data: { suggestions: titles }
    }
  end

  private

  def sanitize_like(str)
    str.gsub(/[%_]/, "").strip
  end

  def highlight_match(text, query)
    return text.to_s.truncate(200) if text.blank?
    terms = query.split(/\s+/).reject(&:blank?)
    highlighted = text.to_s
    terms.each do |term|
      highlighted = highlighted.gsub(/(#{Regexp.escape(term)})/i, '<mark>\1</mark>')
    end
    extract_snippet(highlighted)
  end

  def extract_snippet(text)
    return text.truncate(300) unless text.include?("<mark>")
    idx = text.index("<mark>")
    start = [ idx - 40, 0 ].max
    snippet = text[start..(start + 300)]
    snippet = "...#{snippet}" if start > 0
    snippet = "#{snippet}..." if (start + 300) < text.length
    snippet
  end
end
