ActiveAdmin.register Post do
  permit_params :title, :slug, :content, :summary, :cover, :category_id, :status, :pinned, :published_at, tag_ids: []

  index do
    selectable_column
    id_column
    column :title
    column :slug
    column :status
    column :pinned
    column :category
    column :author
    column :view_count
    column :published_at
    column :created_at
    actions
  end

  filter :title
  filter :slug
  filter :status, as: :select, collection: -> { %w[published draft] }
  filter :pinned
  filter :category
  filter :created_at

  form do |f|
    f.inputs do
      f.input :title
      f.input :slug
      f.input :content, as: :text
      f.input :summary
      f.input :cover
      f.input :category
      f.input :tags, as: :check_boxes
      f.input :status, as: :select, collection: %w[published draft]
      f.input :pinned
      f.input :published_at, as: :date_time_picker
    end
    f.actions
  end

  show do
    attributes_table do
      row :title
      row :slug
      row :content
      row :summary
      row :cover
      row :category
      row :tags do |post|
        post.tags.map(&:name).join(", ")
      end
      row :status
      row :pinned
      row :view_count
      row :comment_count
      row :published_at
      row :created_at
      row :updated_at
    end
  end
end
