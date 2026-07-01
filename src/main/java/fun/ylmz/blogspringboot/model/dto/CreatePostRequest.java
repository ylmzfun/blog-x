package fun.ylmz.blogspringboot.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.Set;

@Data
public class CreatePostRequest {

    @NotBlank(message = "标题不能为空")
    @Size(max = 200)
    private String title;

    @NotBlank(message = "内容不能为空")
    private String content;

    @Size(max = 500)
    private String summary;

    private String cover;

    private Long categoryId;

    private Set<Long> tagIds;

    private String status; // DRAFT or PUBLISHED
}
