class CreateTags < ActiveRecord::Migration[7.2]
  def change
    create_table :tags do |t|
      t.string :name
      t.string :slug
      t.integer :post_count

      t.timestamps
    end
    add_index :tags, :slug, unique: true
  end
end
