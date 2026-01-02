/**
 * 个人网站 - JavaScript 交互逻辑
 * 功能：主题切换、内容发布、图片上传、数据持久化
 */

// ========================================
// 应用状态
// ========================================
const APP_STATE = {
    posts: [],
    gallery: [],
    profile: {
        name: '点击编辑你的名字',
        bio: '点击这里编辑你的个人简介，介绍一下你自己吧！可以写写你的爱好、职业、梦想等等...',
        email: 'your@email.com',
        wechat: 'your_wechat',
        other: '其他联系方式'
    },
    theme: 'light',
    pendingImages: [],
    currentGalleryIndex: 0,
    startDate: null
};

// ========================================
// DOM 元素引用
// ========================================
const DOM = {
    // 导航
    themeToggle: null,
    mobileMenuBtn: null,
    mobileMenu: null,
    navLinks: null,

    // 发布
    postContent: null,
    imageInput: null,
    imagePreview: null,
    publishBtn: null,
    emojiBtn: null,
    emojiPicker: null,
    postsContainer: null,
    emptyState: null,

    // 相册
    galleryInput: null,
    galleryUploadArea: null,
    galleryGrid: null,
    galleryEmpty: null,

    // 图片查看器
    imageViewer: null,
    viewerImage: null,
    viewerClose: null,
    viewerPrev: null,
    viewerNext: null,

    // 统计
    postCount: null,
    photoCount: null,
    dayCount: null,

    // 关于
    aboutName: null,
    aboutBio: null,
    contactEmail: null,
    contactWechat: null,
    contactOther: null,

    // Toast
    toastContainer: null
};

// ========================================
// 初始化
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    loadFromStorage();
    initEventListeners();
    updateStats();
    renderPosts();
    renderGallery();
    applyTheme();
    applyProfile();
});

function initDOM() {
    // 导航
    DOM.themeToggle = document.getElementById('themeToggle');
    DOM.mobileMenuBtn = document.getElementById('mobileMenuBtn');
    DOM.mobileMenu = document.getElementById('mobileMenu');
    DOM.navLinks = document.querySelectorAll('.nav-link, .mobile-link');

    // 发布
    DOM.postContent = document.getElementById('postContent');
    DOM.imageInput = document.getElementById('imageInput');
    DOM.imagePreview = document.getElementById('imagePreview');
    DOM.publishBtn = document.getElementById('publishBtn');
    DOM.emojiBtn = document.getElementById('emojiBtn');
    DOM.emojiPicker = document.getElementById('emojiPicker');
    DOM.postsContainer = document.getElementById('postsContainer');
    DOM.emptyState = document.getElementById('emptyState');

    // 相册
    DOM.galleryInput = document.getElementById('galleryInput');
    DOM.galleryUploadArea = document.getElementById('galleryUploadArea');
    DOM.galleryGrid = document.getElementById('galleryGrid');
    DOM.galleryEmpty = document.getElementById('galleryEmpty');

    // 图片查看器
    DOM.imageViewer = document.getElementById('imageViewer');
    DOM.viewerImage = document.getElementById('viewerImage');
    DOM.viewerClose = document.getElementById('viewerClose');
    DOM.viewerPrev = document.getElementById('viewerPrev');
    DOM.viewerNext = document.getElementById('viewerNext');

    // 统计
    DOM.postCount = document.getElementById('postCount');
    DOM.photoCount = document.getElementById('photoCount');
    DOM.dayCount = document.getElementById('dayCount');

    // 关于
    DOM.aboutName = document.getElementById('aboutName');
    DOM.aboutBio = document.getElementById('aboutBio');
    DOM.contactEmail = document.getElementById('contactEmail');
    DOM.contactWechat = document.getElementById('contactWechat');
    DOM.contactOther = document.getElementById('contactOther');

    // Toast
    DOM.toastContainer = document.getElementById('toastContainer');
}

function initEventListeners() {
    // 主题切换
    DOM.themeToggle.addEventListener('click', toggleTheme);

    // 移动端菜单
    DOM.mobileMenuBtn.addEventListener('click', toggleMobileMenu);

    // 导航链接点击后关闭菜单
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', () => {
            DOM.mobileMenu.classList.remove('active');
            DOM.mobileMenuBtn.classList.remove('active');
        });
    });

    // 平滑滚动 & 导航高亮
    window.addEventListener('scroll', updateActiveNav);

    // 发布功能
    DOM.publishBtn.addEventListener('click', publishPost);
    DOM.imageInput.addEventListener('change', handleImageSelect);
    DOM.emojiBtn.addEventListener('click', toggleEmojiPicker);

    // 表情选择
    document.querySelectorAll('.emoji-item').forEach(emoji => {
        emoji.addEventListener('click', () => insertEmoji(emoji.textContent));
    });

    // 点击其他地方关闭表情选择器
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.emoji-picker') && !e.target.closest('#emojiBtn')) {
            DOM.emojiPicker.classList.remove('active');
        }
    });

    // 相册上传
    DOM.galleryInput.addEventListener('change', handleGalleryUpload);

    // 拖拽上传
    DOM.galleryUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.galleryUploadArea.classList.add('dragover');
    });

    DOM.galleryUploadArea.addEventListener('dragleave', () => {
        DOM.galleryUploadArea.classList.remove('dragover');
    });

    DOM.galleryUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.galleryUploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length) {
            processGalleryFiles(files);
        }
    });

    // 图片查看器
    DOM.viewerClose.addEventListener('click', closeImageViewer);
    DOM.viewerPrev.addEventListener('click', () => navigateViewer(-1));
    DOM.viewerNext.addEventListener('click', () => navigateViewer(1));
    DOM.imageViewer.addEventListener('click', (e) => {
        if (e.target === DOM.imageViewer) closeImageViewer();
    });

    // 键盘事件
    document.addEventListener('keydown', handleKeyboard);

    // 个人资料编辑
    DOM.aboutName.addEventListener('blur', saveProfile);
    DOM.aboutBio.addEventListener('blur', saveProfile);
    DOM.contactEmail.addEventListener('blur', saveProfile);
    DOM.contactWechat.addEventListener('blur', saveProfile);
    DOM.contactOther.addEventListener('blur', saveProfile);
}

// ========================================
// 主题切换
// ========================================
function toggleTheme() {
    APP_STATE.theme = APP_STATE.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveToStorage();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', APP_STATE.theme);
    const themeIcon = DOM.themeToggle.querySelector('.theme-icon');
    themeIcon.textContent = APP_STATE.theme === 'light' ? '🌙' : '☀️';
}

// ========================================
// 移动端菜单
// ========================================
function toggleMobileMenu() {
    DOM.mobileMenuBtn.classList.toggle('active');
    DOM.mobileMenu.classList.toggle('active');
}

// ========================================
// 导航高亮
// ========================================
function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 100;

    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');

        if (scrollPos >= top && scrollPos < top + height) {
            DOM.navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

// ========================================
// 发布功能
// ========================================
function handleImageSelect(e) {
    const files = e.target.files;
    if (files.length === 0) return;

    // 限制最多9张图片
    const maxImages = 9;
    const currentCount = APP_STATE.pendingImages.length;
    const remainingSlots = maxImages - currentCount;

    if (remainingSlots <= 0) {
        showToast('最多只能上传9张图片', 'error');
        return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                APP_STATE.pendingImages.push(event.target.result);
                updateImagePreview();
            };
            reader.readAsDataURL(file);
        }
    });

    // 清空 input 以便再次选择相同文件
    e.target.value = '';
}

function updateImagePreview() {
    DOM.imagePreview.innerHTML = APP_STATE.pendingImages.map((img, index) => `
        <div class="preview-item">
            <img src="${img}" alt="预览图片">
            <button class="preview-remove" onclick="removePreviewImage(${index})">×</button>
        </div>
    `).join('');
}

function removePreviewImage(index) {
    APP_STATE.pendingImages.splice(index, 1);
    updateImagePreview();
}

function toggleEmojiPicker() {
    DOM.emojiPicker.classList.toggle('active');
}

function insertEmoji(emoji) {
    const textarea = DOM.postContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    textarea.value = text.substring(0, start) + emoji + text.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + emoji.length;

    DOM.emojiPicker.classList.remove('active');
}

function publishPost() {
    const content = DOM.postContent.value.trim();
    const images = [...APP_STATE.pendingImages];

    if (!content && images.length === 0) {
        showToast('请输入内容或添加图片', 'error');
        return;
    }

    const post = {
        id: Date.now(),
        content,
        images,
        likes: 0,
        liked: false,
        createdAt: new Date().toISOString()
    };

    APP_STATE.posts.unshift(post);
    saveToStorage();

    // 清空输入
    DOM.postContent.value = '';
    APP_STATE.pendingImages = [];
    updateImagePreview();

    // 重新渲染
    renderPosts();
    updateStats();

    showToast('发布成功！', 'success');
}

function renderPosts() {
    if (APP_STATE.posts.length === 0) {
        DOM.postsContainer.innerHTML = '';
        DOM.emptyState.classList.remove('hidden');
        return;
    }

    DOM.emptyState.classList.add('hidden');
    DOM.postsContainer.innerHTML = APP_STATE.posts.map(post => createPostHTML(post)).join('');
}

function createPostHTML(post) {
    const date = new Date(post.createdAt);
    const timeStr = formatTime(date);

    let imagesHTML = '';
    if (post.images && post.images.length > 0) {
        const layoutClass = post.images.length === 1 ? 'single' :
            post.images.length === 2 ? 'double' : 'multiple';
        imagesHTML = `
            <div class="post-images ${layoutClass}">
                ${post.images.map((img, idx) => `
                    <img src="${img}" alt="图片" class="post-image" 
                         onclick="openPostImageViewer(${post.id}, ${idx})">
                `).join('')}
            </div>
        `;
    }

    return `
        <article class="post-card glass-card" data-id="${post.id}">
            <div class="post-header">
                <div class="post-author">
                    <span class="post-avatar">😊</span>
                    <div class="post-meta">
                        <span class="post-name">${APP_STATE.profile.name}</span>
                        <span class="post-time">${timeStr}</span>
                    </div>
                </div>
                <button class="post-delete" onclick="deletePost(${post.id})" title="删除">
                    🗑️
                </button>
            </div>
            ${post.content ? `<div class="post-content">${escapeHTML(post.content)}</div>` : ''}
            ${imagesHTML}
            <div class="post-actions">
                <button class="action-btn ${post.liked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
                    <span>${post.liked ? '❤️' : '🤍'}</span>
                    <span>${post.likes > 0 ? post.likes : '喜欢'}</span>
                </button>
                <button class="action-btn" onclick="sharePost(${post.id})">
                    <span>🔗</span>
                    <span>分享</span>
                </button>
            </div>
        </article>
    `;
}

function deletePost(postId) {
    if (!confirm('确定要删除这条动态吗？')) return;

    APP_STATE.posts = APP_STATE.posts.filter(p => p.id !== postId);
    saveToStorage();
    renderPosts();
    updateStats();
    showToast('已删除', 'info');
}

function toggleLike(postId) {
    const post = APP_STATE.posts.find(p => p.id === postId);
    if (post) {
        post.liked = !post.liked;
        post.likes += post.liked ? 1 : -1;
        saveToStorage();
        renderPosts();
    }
}

function sharePost(postId) {
    // 复制链接到剪贴板
    const url = window.location.href.split('#')[0] + '#moments';
    navigator.clipboard.writeText(url).then(() => {
        showToast('链接已复制', 'success');
    }).catch(() => {
        showToast('复制失败', 'error');
    });
}

function openPostImageViewer(postId, imageIndex) {
    const post = APP_STATE.posts.find(p => p.id === postId);
    if (post && post.images) {
        APP_STATE.currentViewerImages = post.images;
        APP_STATE.currentGalleryIndex = imageIndex;
        openImageViewer();
    }
}

// ========================================
// 相册功能
// ========================================
function handleGalleryUpload(e) {
    const files = e.target.files;
    if (files.length) {
        processGalleryFiles(files);
    }
    e.target.value = '';
}

function processGalleryFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const photo = {
                    id: Date.now() + Math.random(),
                    src: event.target.result,
                    createdAt: new Date().toISOString()
                };
                APP_STATE.gallery.push(photo);
                saveToStorage();
                renderGallery();
                updateStats();
            };
            reader.readAsDataURL(file);
        }
    });

    showToast('图片上传成功！', 'success');
}

function renderGallery() {
    if (APP_STATE.gallery.length === 0) {
        DOM.galleryGrid.innerHTML = '';
        DOM.galleryEmpty.classList.remove('hidden');
        return;
    }

    DOM.galleryEmpty.classList.add('hidden');
    DOM.galleryGrid.innerHTML = APP_STATE.gallery.map((photo, index) => `
        <div class="gallery-item" onclick="openGalleryViewer(${index})">
            <img src="${photo.src}" alt="相册图片" loading="lazy">
            <div class="gallery-item-overlay">
                <div class="gallery-item-actions">
                    <button class="gallery-action-btn" onclick="event.stopPropagation(); deleteGalleryPhoto('${photo.id}')" title="删除">
                        🗑️
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function deleteGalleryPhoto(photoId) {
    if (!confirm('确定要删除这张照片吗？')) return;

    APP_STATE.gallery = APP_STATE.gallery.filter(p => p.id != photoId);
    saveToStorage();
    renderGallery();
    updateStats();
    showToast('照片已删除', 'info');
}

function openGalleryViewer(index) {
    APP_STATE.currentViewerImages = APP_STATE.gallery.map(p => p.src);
    APP_STATE.currentGalleryIndex = index;
    openImageViewer();
}

// ========================================
// 图片查看器
// ========================================
function openImageViewer() {
    const images = APP_STATE.currentViewerImages;
    if (!images || images.length === 0) return;

    DOM.viewerImage.src = images[APP_STATE.currentGalleryIndex];
    DOM.imageViewer.classList.add('active');
    document.body.style.overflow = 'hidden';

    // 显示/隐藏导航按钮
    DOM.viewerPrev.style.display = images.length > 1 ? 'flex' : 'none';
    DOM.viewerNext.style.display = images.length > 1 ? 'flex' : 'none';
}

function closeImageViewer() {
    DOM.imageViewer.classList.remove('active');
    document.body.style.overflow = '';
}

function navigateViewer(direction) {
    const images = APP_STATE.currentViewerImages;
    if (!images || images.length <= 1) return;

    APP_STATE.currentGalleryIndex += direction;

    if (APP_STATE.currentGalleryIndex < 0) {
        APP_STATE.currentGalleryIndex = images.length - 1;
    } else if (APP_STATE.currentGalleryIndex >= images.length) {
        APP_STATE.currentGalleryIndex = 0;
    }

    DOM.viewerImage.src = images[APP_STATE.currentGalleryIndex];
}

function handleKeyboard(e) {
    if (!DOM.imageViewer.classList.contains('active')) return;

    switch (e.key) {
        case 'Escape':
            closeImageViewer();
            break;
        case 'ArrowLeft':
            navigateViewer(-1);
            break;
        case 'ArrowRight':
            navigateViewer(1);
            break;
    }
}

// ========================================
// 个人资料
// ========================================
function saveProfile() {
    APP_STATE.profile = {
        name: DOM.aboutName.textContent.trim() || '点击编辑你的名字',
        bio: DOM.aboutBio.textContent.trim() || '点击这里编辑你的个人简介...',
        email: DOM.contactEmail.textContent.trim() || 'your@email.com',
        wechat: DOM.contactWechat.textContent.trim() || 'your_wechat',
        other: DOM.contactOther.textContent.trim() || '其他联系方式'
    };
    saveToStorage();
    renderPosts(); // 更新动态中的名字
    showToast('资料已保存', 'success');
}

function applyProfile() {
    DOM.aboutName.textContent = APP_STATE.profile.name;
    DOM.aboutBio.textContent = APP_STATE.profile.bio;
    DOM.contactEmail.textContent = APP_STATE.profile.email;
    DOM.contactWechat.textContent = APP_STATE.profile.wechat;
    DOM.contactOther.textContent = APP_STATE.profile.other;
}

// ========================================
// 统计
// ========================================
function updateStats() {
    DOM.postCount.textContent = APP_STATE.posts.length;

    const totalPhotos = APP_STATE.gallery.length +
        APP_STATE.posts.reduce((sum, p) => sum + (p.images?.length || 0), 0);
    DOM.photoCount.textContent = totalPhotos;

    // 计算开站天数
    if (APP_STATE.startDate) {
        const start = new Date(APP_STATE.startDate);
        const now = new Date();
        const days = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
        DOM.dayCount.textContent = days;
    }
}

// ========================================
// 数据持久化
// ========================================
function saveToStorage() {
    const data = {
        posts: APP_STATE.posts,
        gallery: APP_STATE.gallery,
        profile: APP_STATE.profile,
        theme: APP_STATE.theme,
        startDate: APP_STATE.startDate
    };

    try {
        localStorage.setItem('personalWebsiteData', JSON.stringify(data));
    } catch (e) {
        console.error('保存数据失败:', e);
        if (e.name === 'QuotaExceededError') {
            showToast('存储空间已满，请删除一些内容', 'error');
        }
    }
}

function loadFromStorage() {
    try {
        const data = localStorage.getItem('personalWebsiteData');
        if (data) {
            const parsed = JSON.parse(data);
            APP_STATE.posts = parsed.posts || [];
            APP_STATE.gallery = parsed.gallery || [];
            APP_STATE.profile = parsed.profile || APP_STATE.profile;
            APP_STATE.theme = parsed.theme || 'light';
            APP_STATE.startDate = parsed.startDate || new Date().toISOString();
        } else {
            // 首次访问
            APP_STATE.startDate = new Date().toISOString();
            saveToStorage();
        }
    } catch (e) {
        console.error('加载数据失败:', e);
    }
}

// ========================================
// Toast 提示
// ========================================
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// 工具函数
// ========================================
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(date) {
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// 暴露全局函数供 HTML onclick 使用
window.removePreviewImage = removePreviewImage;
window.deletePost = deletePost;
window.toggleLike = toggleLike;
window.sharePost = sharePost;
window.openPostImageViewer = openPostImageViewer;
window.deleteGalleryPhoto = deleteGalleryPhoto;
window.openGalleryViewer = openGalleryViewer;
