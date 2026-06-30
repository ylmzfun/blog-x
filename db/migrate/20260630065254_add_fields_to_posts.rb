class AddFieldsToPosts < ActiveRecord::Migration[7.2]
  def change
    add_column :posts, :slug, :string
    add_index :posts, :slug, unique: true
    add_column :posts, :summary, :text
    add_column :posts, :cover, :string
    add_reference :posts, :category, foreign_key: true
    add_reference :posts, :author, foreign_key: { to_table: :users }
    add_column :posts, :status, :string, null: false, default: "published"
    add_column :posts, :pinned, :boolean, default: false
    add_column :posts, :view_count, :integer, default: 0
    add_column :posts, :comment_count, :integer, default: 0
    add_column :posts, :published_at, :datetime
    add_column :posts, :deleted_at, :datetime

    add_index :posts, :status
    add_index :posts, :pinned
    add_index :posts, :deleted_at
    add_index :posts, :published_at
  end
end
