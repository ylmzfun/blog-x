class CreateComments < ActiveRecord::Migration[7.2]
  def change
    create_table :comments do |t|
      t.references :post, null: false, foreign_key: true
      t.references :author, null: false, foreign_key: { to_table: :users }
      t.text :content, null: false
      t.integer :parent_id
      t.string :status, null: false, default: "approved"
      t.datetime :deleted_at

      t.timestamps
    end
    add_index :comments, :parent_id
    add_index :comments, :status
  end
end
