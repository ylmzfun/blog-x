package fun.ylmz.blogspringboot.service;

import fun.ylmz.blogspringboot.common.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileUploadService {

    @Value("${app.upload.path:./data/uploads}")
    private String uploadPath;

    public String upload(MultipartFile file, String subDir) {
        if (file.isEmpty()) {
            throw new BusinessException(400, "文件为空");
        }

        String originalName = file.getOriginalFilename();
        if (originalName == null) {
            throw new BusinessException(400, "文件名无效");
        }

        String ext = "";
        int dotIndex = originalName.lastIndexOf('.');
        if (dotIndex > 0) {
            ext = originalName.substring(dotIndex);
        }

        String newName = UUID.randomUUID() + ext;
        Path dir = Paths.get(uploadPath, subDir);
        try {
            Files.createDirectories(dir);
            Path target = dir.resolve(newName);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
            return "/uploads/" + subDir + "/" + newName;
        } catch (IOException e) {
            throw new BusinessException(500, "文件上传失败");
        }
    }
}
