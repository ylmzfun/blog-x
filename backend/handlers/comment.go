package handlers

import (
	"strconv"

	"backend/models"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

func GetComments(c *gin.Context) {
	postIDStr := c.Query("postId")
	postID, err := strconv.ParseUint(postIDStr, 10, 64)
	if err != nil || postID == 0 {
		utils.Error(c, 400, "参数错误：需要 postId")
		return
	}

	page, pageSize := utils.GetPageParams(c)

	// fetch top-level comments with children
	var total int64
	models.DB.Model(&models.Comment{}).
		Where("post_id = ? AND parent_id IS NULL AND status = ?", postID, "approved").Count(&total)

	var comments []models.Comment
	models.DB.Preload("Author").Preload("Children.Author").
		Where("post_id = ? AND parent_id IS NULL AND status = ?", postID, "approved").
		Order("created_at DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&comments)

	utils.Paginated(c, comments, total, page, pageSize)
}

type commentInput struct {
	PostID   uint   `json:"postId" binding:"required"`
	Content  string `json:"content" binding:"required"`
	ParentID *uint  `json:"parentId"`
}

func CreateComment(c *gin.Context) {
	var input commentInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.Error(c, 400, "参数错误")
		return
	}

	var post models.Post
	if err := models.DB.First(&post, input.PostID).Error; err != nil {
		utils.Error(c, 404, "文章不存在")
		return
	}

	// if parent is set, verify it exists and belongs to the same post
	if input.ParentID != nil {
		var parent models.Comment
		if err := models.DB.Where("id = ? AND post_id = ?", *input.ParentID, input.PostID).First(&parent).Error; err != nil {
			utils.Error(c, 400, "回复的评论不存在")
			return
		}
	}

	userID := c.GetUint("userId")
	comment := models.Comment{
		PostID:   input.PostID,
		AuthorID: userID,
		Content:  input.Content,
		ParentID: input.ParentID,
		Status:   "approved",
	}

	if err := models.DB.Create(&comment).Error; err != nil {
		utils.Error(c, 500, "评论失败")
		return
	}

	// update post comment count
	models.DB.Model(&post).UpdateColumn("comment_count", post.CommentCount+1)

	models.DB.Preload("Author").First(&comment, comment.ID)
	utils.Success(c, comment)
}

func DeleteComment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Error(c, 404, "评论不存在")
		return
	}

	var comment models.Comment
	if err := models.DB.First(&comment, id).Error; err != nil {
		utils.Error(c, 404, "评论不存在")
		return
	}

	userID := c.GetUint("userId")
	role, _ := c.Get("role")
	if comment.AuthorID != userID && role != "admin" {
		utils.Error(c, 403, "权限不足")
		return
	}

	tx := models.DB.Begin()
	tx.Delete(&comment)
	// also delete child comments
	tx.Where("parent_id = ?", id).Delete(&models.Comment{})
	// update post comment count
	var count int64
	tx.Model(&models.Comment{}).Where("post_id = ? AND deleted_at IS NULL", comment.PostID).Count(&count)
	tx.Model(&models.Post{}).Where("id = ?", comment.PostID).Update("comment_count", count)
	tx.Commit()

	utils.Success(c, nil)
}

func ApproveComment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 64)
	if err != nil {
		utils.Error(c, 404, "评论不存在")
		return
	}

	var comment models.Comment
	if err := models.DB.First(&comment, id).Error; err != nil {
		utils.Error(c, 404, "评论不存在")
		return
	}

	models.DB.Model(&comment).Update("status", "approved")
	utils.Success(c, comment)
}
