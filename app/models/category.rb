class Category < ApplicationRecord
  has_many :posts, dependent: :nullify

  validates :name, presence: true, length: { maximum: 50 }
  validates :slug, presence: true, uniqueness: true,
            format: { with: /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/ },
            length: { maximum: 50 }
  validates :description, length: { maximum: 500 }, allow_blank: true

  before_validation :generate_slug, on: :create, unless: :slug?

  scope :with_post_counts, -> {
    left_joins(:posts)
      .where(posts: { status: "published", deleted_at: nil })
      .group(:id)
      .select("categories.*, COUNT(posts.id) AS post_count")
  }

  def recalculate_post_count!
    update!(post_count: posts.published.count)
  end

  def as_json(options = nil)
    {
      id: id.to_s,
      name: name,
      slug: slug,
      description: description,
      postCount: post_count
    }
  end

  private

  def generate_slug
    self.slug = name.to_s.parameterize
  end
end
