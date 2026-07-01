package fun.ylmz.blogspringboot.model.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String nickname;
    private String avatar;
    private String bio;
    private String website;
}
