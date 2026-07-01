package handlers

import (
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"backend/config"
	"backend/utils"

	"github.com/gin-gonic/gin"
)

func UploadImage(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		utils.Error(c, 400, "请选择文件")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowed := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true, ".svg": true}
	if !allowed[ext] {
		utils.Error(c, 400, "不支持的图片格式")
		return
	}

	if file.Size > 10*1024*1024 {
		utils.Error(c, 400, "文件大小不能超过 10MB")
		return
	}

	cfg := config.Load()
	filename := "img_" + strconv.FormatInt(time.Now().UnixMilli(), 10) + ext
	savePath := filepath.Join(cfg.UploadDir, filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		utils.Error(c, 500, "文件保存失败")
		return
	}

	utils.Success(c, gin.H{"url": "/uploads/" + filename})
}
