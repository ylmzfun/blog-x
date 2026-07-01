package fun.ylmz.blogspringboot.service;

import fun.ylmz.blogspringboot.common.BusinessException;
import fun.ylmz.blogspringboot.model.dto.CreateCategoryRequest;
import fun.ylmz.blogspringboot.model.entity.Category;
import fun.ylmz.blogspringboot.model.vo.CategoryVO;
import fun.ylmz.blogspringboot.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryVO> list() {
        return categoryRepository.findAll().stream()
                .map(this::toVO).collect(Collectors.toList());
    }

    public CategoryVO getBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
                .orElseThrow(() -> new BusinessException(404, "分类不存在"));
        return toVO(category);
    }

    @Transactional
    public CategoryVO create(CreateCategoryRequest request) {
        if (categoryRepository.existsBySlug(request.getSlug())) {
            throw new BusinessException(400, "Slug 已存在");
        }
        Category category = new Category();
        category.setName(request.getName());
        category.setSlug(request.getSlug());
        category.setDescription(request.getDescription());
        return toVO(categoryRepository.save(category));
    }

    @Transactional
    public CategoryVO update(Long id, CreateCategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "分类不存在"));
        if (!category.getSlug().equals(request.getSlug())
                && categoryRepository.existsBySlug(request.getSlug())) {
            throw new BusinessException(400, "Slug 已存在");
        }
        category.setName(request.getName());
        category.setSlug(request.getSlug());
        category.setDescription(request.getDescription());
        return toVO(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(404, "分类不存在"));
        if (category.getPostCount() > 0) {
            throw new BusinessException(400, "该分类下还有文章，无法删除");
        }
        categoryRepository.delete(category);
    }

    public CategoryVO toVO(Category category) {
        return CategoryVO.builder()
                .id(category.getId())
                .name(category.getName())
                .slug(category.getSlug())
                .description(category.getDescription())
                .postCount(category.getPostCount())
                .createdAt(category.getCreatedAt())
                .build();
    }
}
