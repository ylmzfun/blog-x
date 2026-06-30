class Comment < ApplicationRecord
  belongs_to :post, counter_cache: :comment_count
  belongs_to :author, class_name: "User"

  belongs_to :parent, class_name: "Comment", optional: true
  has_many :replies, class_name: "Comment", foreign_key: :parent_id, dependent: :destroy

  validates :content, presence: true, length: { maximum: 2000 }

  scope :approved, -> { where(status: "approved") }
  scope :pending, -> { where(status: "pending") }
  scope :roots, -> { where(parent_id: nil) }
  scope :active, -> { where(deleted_at: nil) }

  before_save :sanitize_content

  def soft_delete!
    update!(deleted_at: Time.current)
  end

  def reply_to_user
    return nil unless parent_id
    parent&.author
  end

  def as_tree_json
    {
      id: id.to_s,
      content: deleted_at ? "[deleted]" : content,
      author: author&.as_public_json,
      parentId: parent_id&.to_s,
      replyTo: reply_to_user&.as_public_json&.slice(:id, :username),
      status: status,
      replies: replies.approved.active.order(created_at: :asc).map(&:as_tree_json),
      createdAt: created_at.iso8601
    }.compact
  end

  private

  def sanitize_content
    self.content = Sanitize.fragment(content, Sanitize::Config::BASIC)
  end
end
