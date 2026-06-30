class Post < ApplicationRecord
  belongs_to :category, optional: true
  belongs_to :author, class_name: "User", optional: true

  has_many :post_tags, dependent: :destroy
  has_many :tags, through: :post_tags
  has_many :comments, dependent: :destroy
  has_one_attached :cover_image

  validates :title, presence: true, length: { maximum: 200 }
  validates :slug, presence: true, uniqueness: true,
            format: { with: /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/, message: "only lowercase letters, numbers, hyphens" },
            length: { maximum: 200 }
  validates :status, inclusion: { in: %w[published draft] }
  validates :content, presence: true

  before_validation :generate_slug, on: :create, unless: :slug?
  before_save :set_published_at

  scope :published, -> { where(status: "published").where(deleted_at: nil) }
  scope :drafts, -> { where(status: "draft").where(deleted_at: nil) }
  scope :pinned_first, -> { order(pinned: :desc, published_at: :desc) }
  scope :latest, -> { order(published_at: :desc) }
  scope :popular, -> { order(view_count: :desc) }
  scope :by_category, ->(slug) { joins(:category).where(categories: { slug: slug }) }
  scope :by_tag, ->(slug) { joins(:tags).where(tags: { slug: slug }) }

  def soft_delete!
    update!(deleted_at: Time.current)
    posts_fts_update
  end

  def increment_view!
    increment!(:view_count)
  end

  def prev_post
    Post.published.latest.where("published_at < ?", published_at).first
  end

  def next_post
    Post.published.latest.where("published_at > ?", published_at).first
  end

  def as_list_json
    {
      id: id.to_s,
      title: title,
      slug: slug,
      summary: summary,
      cover: cover_url,
      author: author&.as_public_json,
      category: category&.as_json,
      tags: tags.map(&:as_json),
      viewCount: view_count,
      commentCount: comment_count,
      pinned: pinned,
      status: status,
      publishedAt: published_at&.iso8601,
      createdAt: created_at.iso8601
    }
  end

  def as_detail_json
    prev = prev_post
    nxt = next_post
    as_list_json.merge(
      content: content,
      prevPost: prev ? { title: prev.title, slug: prev.slug } : nil,
      nextPost: nxt ? { title: nxt.title, slug: nxt.slug } : nil
    ).compact
  end

  def cover_url
    if cover_image.attached?
      Rails.application.routes.url_helpers.rails_blob_url(cover_image, only_path: true)
    elsif cover.present?
      cover
    end
  end

  def self.ransackable_attributes(auth_object = nil)
    %w[slug content created_at id title updated_at status pinned view_count comment_count published_at category_id author_id]
  end

  def self.ransackable_associations(auth_object = nil)
    %w[author category comments cover_image_attachment cover_image_blob post_tags tags]
  end

  private

  def generate_slug
    base = title.to_s.parameterize
    candidate = base
    n = 1
    while Post.exists?(slug: candidate)
      candidate = "#{base}-#{n}"
      n += 1
    end
    self.slug = candidate
  end

  def set_published_at
    self.published_at ||= Time.current if status == "published"
  end

  def posts_fts_update
    ActiveRecord::Base.connection.execute(
      "INSERT INTO posts_fts(posts_fts, rowid, title, content) VALUES ('delete', ?, ?, ?)",
      [ id, title, content ]
    )
  end
end
