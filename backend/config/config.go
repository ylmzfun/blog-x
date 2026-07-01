/*
 * @Author: ylmzfun ylmzfun@163.com
 * @Date: 2026-07-01 14:51:11
 * @LastEditors: ylmzfun ylmzfun@163.com
 * @LastEditTime: 2026-07-01 14:57:49
 * @FilePath: /blog-go-vue/backend/config/config.go
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
package config

import "os"

type Config struct {
	Port        string
	DBPath      string
	JWTSecret   string
	UploadDir   string
	AllowOrigin string
}

func Load() *Config {
	return &Config{
		Port:        getEnv("PORT", "8080"),
		DBPath:      getEnv("DB_PATH", "./blog.db"),
		JWTSecret:   getEnv("JWT_SECRET", "blog-secret-key-change-in-production"),
		UploadDir:   getEnv("UPLOAD_DIR", "./uploads"),
		AllowOrigin: getEnv("ALLOW_ORIGIN", "http://localhost:5173"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
