document.addEventListener('DOMContentLoaded', async () => {
    // Get blog ID from URL
    const blogId = window.location.pathname.split('/').pop();
    await loadBlogPost(blogId);
});

async function loadBlogPost(blogId) {
    try {
        const response = await fetch(`/api/blog/${blogId}`);
        const data = await response.json();
        
        if (data.success) {
            const { blog } = data;
            renderBlogPost(blog);
        } else {
            showError('Blog post not found');
        }
    } catch (error) {
        console.error('Error loading blog post:', error);
        showError('Error loading blog post');
    }
}

function renderBlogPost(blog) {
    // Update page title
    document.title = `${blog.title} - SAGE POND`;

    // Render blog content
    const contentDiv = document.getElementById('blog-content');
    contentDiv.innerHTML = `
        <h1 class="text-4xl font-bold mb-4">${blog.title}</h1>
        ${blog.imageUrl ? `<img src="${blog.imageUrl}" alt="${blog.title}" class="w-full h-64 object-cover rounded-lg mb-8">` : ''}
        <div class="prose dark:prose-invert max-w-none">
            ${blog.content}
        </div>
        ${blog.tags?.length ? `
        <div class="mt-8">
            <div class="flex flex-wrap gap-2">
                ${blog.tags.map(tag => `
                    <span class="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm">${tag}</span>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;

    // Update author info
    if (blog.author) {
        document.getElementById('author-image').src = blog.author.photoURL;
        document.getElementById('author-image').alt = blog.author.name;
        document.getElementById('author-name').textContent = blog.author.name;
        document.getElementById('publish-date').textContent = new Date(blog.publishedAt.seconds * 1000).toLocaleDateString();
    }
}

function showError(message) {
    const contentDiv = document.getElementById('blog-content');
    contentDiv.innerHTML = `
        <div class="text-center py-12">
            <h2 class="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Error</h2>
            <p class="text-gray-600 dark:text-gray-400">${message}</p>
            <a href="/" class="mt-4 inline-block text-indigo-600 dark:text-indigo-400 hover:underline">Return to Home</a>
        </div>
    `;
}