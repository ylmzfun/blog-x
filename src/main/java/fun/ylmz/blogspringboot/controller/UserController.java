package fun.ylmz.blogspringboot.controller;

import fun.ylmz.blogspringboot.common.Result;
import fun.ylmz.blogspringboot.model.dto.ChangePasswordRequest;
import fun.ylmz.blogspringboot.model.dto.UpdateUserRequest;
import fun.ylmz.blogspringboot.model.entity.User;
import fun.ylmz.blogspringboot.model.vo.UserVO;
import fun.ylmz.blogspringboot.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public Result<UserVO> getCurrentUser(@AuthenticationPrincipal User user) {
        return Result.success(userService.getCurrentUser(user));
    }

    @PutMapping("/me")
    public Result<UserVO> updateCurrentUser(@AuthenticationPrincipal User user,
                                            @RequestBody UpdateUserRequest request) {
        return Result.success(userService.updateCurrentUser(user, request));
    }

    @PutMapping("/me/password")
    public Result<Void> changePassword(@AuthenticationPrincipal User user,
                                       @Valid @RequestBody ChangePasswordRequest request) {
        userService.changePassword(user, request.getOldPassword(), request.getNewPassword());
        return Result.success();
    }

    @GetMapping("/{id}")
    public Result<UserVO> getUserById(@PathVariable Long id) {
        return Result.success(userService.getUserById(id));
    }
}
