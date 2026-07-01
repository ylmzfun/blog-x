package fun.ylmz.blogspringboot.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateCategoryRequest {

    @NotBlank(message = "名称不能为空")
    @Size(max = 50)
    private String name;

    @NotBlank(message = "Slug不能为空")
    @Size(max = 100)
    private String slug;

    @Size(max = 500)
    private String description;
}
