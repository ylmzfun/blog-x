package fun.ylmz.blogspringboot.service;

import fun.ylmz.blogspringboot.common.BusinessException;
import fun.ylmz.blogspringboot.common.JwtUtil;
import fun.ylmz.blogspringboot.model.dto.*;
import fun.ylmz.blogspringboot.model.entity.User;
import fun.ylmz.blogspringboot.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(400, "邮箱已被注册");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new BusinessException(400, "用户名已被使用");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setRole(User.Role.USER);
        return userRepository.save(user);
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmailOrUsername(request.getAccount(), request.getAccount())
                .orElseThrow(() -> new BusinessException(401, "账号或密码错误"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new BusinessException(401, "账号或密码错误");
        }

        String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getUsername(), user.getRole().name());
        String refreshToken = jwtUtil.generateRefreshToken(user.getId());

        LoginResponse response = new LoginResponse();
        response.setAccessToken(accessToken);
        response.setRefreshToken(refreshToken);
        response.setExpiresIn(7200);
        return response;
    }

    public LoginResponse refresh(RefreshTokenRequest request) {
        try {
            Long userId = Long.parseLong(jwtUtil.parseRefreshToken(request.getRefreshToken()).getSubject());
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new BusinessException(401, "用户不存在"));

            String accessToken = jwtUtil.generateAccessToken(user.getId(), user.getUsername(), user.getRole().name());
            String refreshToken = jwtUtil.generateRefreshToken(user.getId());

            LoginResponse response = new LoginResponse();
            response.setAccessToken(accessToken);
            response.setRefreshToken(refreshToken);
            response.setExpiresIn(7200);
            return response;
        } catch (Exception e) {
            throw new BusinessException(401, "无效的 refresh token");
        }
    }

    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(404, "邮箱未注册"));
        // In production: send email with reset link
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        // In production: validate reset token from email
        throw new BusinessException(400, "密码重置功能暂未开放");
    }

    public User findUserByAccount(String account) {
        return userRepository.findByEmailOrUsername(account, account)
                .orElseThrow(() -> new BusinessException(401, "用户不存在"));
    }

    public User getUserById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "用户不存在"));
    }
}
