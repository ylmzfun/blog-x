class Tag < ApplicationRecord
  has_many :post_tags, dependent: :destroy
  has_many :posts, through: :post_tags

  validates :name, presence: true, length: { maximum: 30 }
  validates :slug, presence: true, uniqueness: true,
            format: { with: /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/ },
            length: { maximum: 30 }

  before_validation :generate_slug, on: :create, unless: :slug?

  scope :with_post_counts, -> {
    left_joins(post_tags: :post)
      .where(posts: { status: "published", deleted_at: nil })
      .group(:id)
      .select("tags.*, COUNT(DISTINCT posts.id) AS post_count")
  }

  def recalculate_post_count!
    update!(post_count: posts.published.count)
  end

  def as_json(options = nil)
    {
      id: id.to_s,
      name: name,
      slug: slug,
      postCount: post_count
    }
  end

  private

  def generate_slug
    self.slug = name.to_s.parameterize
  end
end
