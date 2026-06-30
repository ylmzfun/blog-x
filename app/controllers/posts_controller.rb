class PostsController < ApplicationController
  def index
    @posts = Post.published.latest
  end

  def show
    @post = Post.published.find_by!(slug: params[:slug])
  end
end
