class User < ApplicationRecord
  has_secure_password

  has_many :posts, foreign_key: :author_id, dependent: :nullify
  has_many :comments, foreign_key: :author_id, dependent: :nullify
  has_one_attached :avatar_image

  validates :username, presence: true,
            uniqueness: { case_sensitive: false },
            length: { minimum: 2, maximum: 30 },
            format: { with: /\A[a-zA-Z0-9_]+\z/, message: "only letters, numbers, underscores" }
  validates :email, presence: true,
            uniqueness: { case_sensitive: false },
            format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 6 }, if: :password_digest_changed?
  validates :role, inclusion: { in: %w[admin author user] }
  validates :website, format: { with: /\Ahttps?:\/\/.*\z/, message: "must start with http:// or https://" },
            allow_blank: true

  before_save { self.email = email.downcase }

  scope :admins, -> { where(role: "admin") }
  scope :authors, -> { where(role: %w[admin author]) }

  def admin?
    role == "admin"
  end

  def author?
    %w[admin author].include?(role)
  end

  def avatar_url
    if avatar_image.attached?
      Rails.application.routes.url_helpers.rails_blob_url(avatar_image, only_path: true)
    elsif avatar.present?
      avatar
    end
  end

  def as_public_json
    {
      id: id.to_s,
      username: username,
      avatar: avatar_url,
      bio: bio,
      website: website,
      role: role,
      createdAt: created_at.iso8601
    }
  end

  def as_private_json
    as_public_json.merge(
      email: email,
      emailVerified: email_verified
    )
  end
end
