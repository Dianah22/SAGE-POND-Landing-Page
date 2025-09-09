// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDyXWSxpBqk7lgomflc_Sl3BCXp8Dvffbg",
    authDomain: "sage-pond-gen-ai.firebaseapp.com",
    projectId: "sage-pond-gen-ai",
    storageBucket: "sage-pond-gen-ai.appspot.com",
    messagingSenderId: "369426724601",
    appId: "1:369426724601:web:698e582d4e10ff710c5428",
    measurementId: "G-XY1Y3VW550"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function () {
    // Function to display feedback messages
    function showFeedback(elementId, message, isError = false) {
        const feedbackDiv = document.getElementById(elementId);
        if (feedbackDiv) {
            feedbackDiv.textContent = message;
            feedbackDiv.className = 'mb-4 p-3 rounded-lg text-sm '; // Base classes
            if (isError) {
                feedbackDiv.classList.add('bg-red-100', 'text-red-700', 'dark:bg-red-200', 'dark:text-red-800');
            } else {
                feedbackDiv.classList.add('bg-green-100', 'text-green-700', 'dark:bg-green-200', 'dark:text-green-800');
            }
            feedbackDiv.classList.remove('hidden');
            setTimeout(() => {
                feedbackDiv.classList.add('hidden');
                feedbackDiv.textContent = '';
            }, 5000); // Hide after 5 seconds
        }
    }

    const dashboardLink = document.getElementById('dashboard-link');
    const blogPostsLink = document.getElementById('blog-posts-link');
    const researchPostsLink = document.getElementById('research-posts-link');
    const analyticsLink = document.getElementById('analytics-link');
    const logoutLink = document.getElementById('logout-link');

    const dashboardSection = document.getElementById('dashboard-section');
    const blogPostsSection = document.getElementById('blog-posts-section');
    const researchPostsSection = document.getElementById('research-posts-section');
    const analyticsSection = document.getElementById('analytics-section');

    const sections = [dashboardSection, blogPostsSection, researchPostsSection, analyticsSection];
    const links = [dashboardLink, blogPostsLink, researchPostsLink, analyticsLink];

    function hideAllSections() {
        sections.forEach(section => {
            if(section) section.classList.add('hidden');
        });
    }

    function removeActiveStyles() {
        links.forEach(link => {
            if(link) link.classList.remove('bg-gray-100', 'dark:bg-gray-700');
        });
    }

    function showSection(sectionToShow, linkToActivate) {
        hideAllSections();
        removeActiveStyles();
        if(sectionToShow) sectionToShow.classList.remove('hidden');
        if(linkToActivate) linkToActivate.classList.add('bg-gray-100', 'dark:bg-gray-700');
    }

    if(dashboardLink) {
        dashboardLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(dashboardSection, dashboardLink);
        });
    }

    if(blogPostsLink) {
        blogPostsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(blogPostsSection, blogPostsLink);
            if (typeof loadBlogPostsForManagement === 'function') {
                loadBlogPostsForManagement();
            }
            if (typeof tinymce !== 'undefined') {
                if (tinymce.get('blog-post-content')) {
                    tinymce.get('blog-post-content').remove();
                }
                tinymce.init({
                    selector: '#blog-post-content',
                    plugins: 'advlist autolink lists link image charmap print preview hr anchor pagebreak',
                    toolbar_mode: 'floating',
                });
            }
            document.getElementById('blog-post-form').reset();
            if(tinymce.get('blog-post-content')) {
                tinymce.get('blog-post-content').setContent('');
            }
            document.getElementById('blog-form-title').textContent = 'Create New Blog Post';
            const publishBtn = document.getElementById('publish-blog-post-btn');
            publishBtn.textContent = 'Publish Blog Post';
            delete publishBtn.dataset.editingId;
        });
    }

    if(researchPostsLink) {
        researchPostsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(researchPostsSection, researchPostsLink);
            if (typeof loadResearchPostsForManagement === 'function') {
                loadResearchPostsForManagement();
            }
            if (typeof tinymce !== 'undefined') {
                if (tinymce.get('research-post-content')) {
                    tinymce.get('research-post-content').remove();
                }
                tinymce.init({
                    selector: '#research-post-content',
                    plugins: 'advlist autolink lists link image charmap print preview hr anchor pagebreak',
                    toolbar_mode: 'floating',
                });
            }
            document.getElementById('research-post-form').reset();
            if(tinymce.get('research-post-content')){
                tinymce.get('research-post-content').setContent('');
            }
            document.getElementById('research-form-title').textContent = 'Create New Research Post';
            const publishBtn = document.getElementById('publish-research-post-btn');
            publishBtn.textContent = 'Publish Research Post';
            delete publishBtn.dataset.editingId;
        });
    }

    function loadMockAnalyticsData() {
        const dailyVisitorsChart = document.getElementById('daily-visitors-chart');
        const signupsChart = document.getElementById('signups-chart');

        if (dailyVisitorsChart) {
            dailyVisitorsChart.innerHTML = ''; // Clear existing bars
            for (let i = 0; i < 7; i++) {
                const height = Math.floor(Math.random() * 80) + 20; // random height between 20% and 100%
                const bar = document.createElement('div');
                bar.className = 'bg-blue-500 rounded-t-lg';
                bar.style.height = `${height}%`;
                bar.style.width = '12%';
                dailyVisitorsChart.appendChild(bar);
            }
        }

        if (signupsChart) {
            signupsChart.innerHTML = ''; // Clear existing bars
            for (let i = 0; i < 7; i++) {
                const height = Math.floor(Math.random() * 80) + 20; // random height between 20% and 100%
                const bar = document.createElement('div');
                bar.className = 'bg-green-500 rounded-t-lg';
                bar.style.height = `${height}%`;
                bar.style.width = '12%';
                signupsChart.appendChild(bar);
            }
        }
    }

    async function loadApiRequestCount() {
        const apiRequestsCountDiv = document.getElementById('api-requests-count');
        if (apiRequestsCountDiv) {
            apiRequestsCountDiv.textContent = '...'; // loading state
            try {
                const doc = await db.collection('analytics').doc('api_requests_counter').get();
                if (doc.exists) {
                    apiRequestsCountDiv.textContent = doc.data().count;
                } else {
                    apiRequestsCountDiv.textContent = '0';
                }
            } catch (error) {
                console.error("Error fetching API request count: ", error);
                apiRequestsCountDiv.textContent = 'N/A';
            }
        }
    }

    if(analyticsLink) {
        analyticsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(analyticsSection, analyticsLink);
            loadMockAnalyticsData();
            loadApiRequestCount();
        });
    }

    if(logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Implement logout functionality here
            alert('Logout clicked');
        });
    }

    // Show the dashboard by default
    showSection(dashboardSection, dashboardLink);

    const newPostBtn = document.getElementById('new-post-btn');
    if (newPostBtn) {
        newPostBtn.addEventListener('click', () => {
            blogPostsLink.click();
        });
    }

    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');

    if (userMenuButton) {
        userMenuButton.addEventListener('click', () => {
            userDropdown.classList.toggle('hidden');
        });
    }

    // Close the dropdown if the user clicks outside of it
    window.addEventListener('click', function(event) {
        if (userMenuButton && userDropdown && !userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.add('hidden');
        }
    });

    const logoutLinkDropdown = document.getElementById('logout-link-dropdown');
    if(logoutLinkDropdown) {
        logoutLinkDropdown.addEventListener('click', (e) => {
            e.preventDefault();
            logoutLink.click();
        });
    }

    async function loadBlogPostsForManagement() {
        const blogPostsListDiv = document.getElementById('blog-posts-list');
        if (!blogPostsListDiv) return;

        blogPostsListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading blog posts...</p>'; 

        try {
            const querySnapshot = await db.collection('blogPosts').orderBy('createdAt', 'desc').get();
            if (querySnapshot.empty) {
                blogPostsListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No blog posts found.</p>';
                return;
            }

            let postsHtml = '';
            querySnapshot.forEach(doc => {
                const post = doc.data();
                const postId = doc.id;
                const snippet = post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content;
                
                postsHtml += `
                    <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800" id="post-${postId}">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">${post.title}</h3>
                        <p class="text-gray-500 dark:text-gray-400 text-sm mb-2">Published: ${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Date N/A'}</p>
                        <div class="text-gray-700 dark:text-gray-300 mb-3">${snippet}</div>
                        <button data-id="${postId}" class="edit-blog-post-btn px-3 py-1.5 text-sm font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 mr-2">Edit</button>
                        <button data-id="${postId}" class="delete-blog-post-btn px-3 py-1.5 text-sm font-medium text-center text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-900">Delete</button>
                    </div>
                `;
            });
            blogPostsListDiv.innerHTML = postsHtml;

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-blog-post-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const postId = e.target.dataset.id;
                    if (confirm('Are you sure you want to delete this blog post?')) {
                        try {
                            await db.collection('blogPosts').doc(postId).delete();
                            showFeedback('manage-blog-feedback', 'Blog post deleted successfully!');
                            loadBlogPostsForManagement(); // Refresh the list
                        } catch (error) {
                            console.error("Error deleting blog post: ", error);
                            showFeedback('manage-blog-feedback', 'Failed to delete blog post. See console for details.', true);
                        }
                    }
                });
            });

            // Add event listeners for edit buttons
            document.querySelectorAll('.edit-blog-post-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const postId = e.target.dataset.id;
                    const postDoc = await db.collection('blogPosts').doc(postId).get();
                    if (!postDoc.exists) {
                        showFeedback('manage-blog-feedback', 'Blog post not found for editing.', true);
                        return;
                    }
                    const postData = postDoc.data();

                    window.scrollTo(0, 0);
                    
                    // Ensure TinyMCE is initialized for blog content
                    if (typeof tinymce !== 'undefined') {
                        if (tinymce.get('blog-post-content')) {
                            tinymce.get('blog-post-content').setContent(postData.content || '');
                        } else {
                            await tinymce.init({
                                selector: '#blog-post-content',
                                plugins: 'advlist autolink lists link image charmap print preview hr anchor pagebreak',
                                toolbar_mode: 'floating',
                            });
                            tinymce.get('blog-post-content').setContent(postData.content || '');
                        }
                    }

                    document.getElementById('blog-post-title').value = postData.title || '';
                    document.getElementById('blog-post-author').value = postData.author || '';
                    document.getElementById('blog-post-tags').value = postData.tags ? postData.tags.join(', ') : '';

                    const publishBtn = document.getElementById('publish-blog-post-btn');
                    publishBtn.textContent = 'Update Blog Post';
                    publishBtn.dataset.editingId = postId; // Store ID for update
                    document.getElementById('blog-form-title').textContent = 'Edit Blog Post';
                });
            });

        } catch (error) {
            console.error("Error loading blog posts: ", error);
            blogPostsListDiv.innerHTML = '<p class="text-red-500">Failed to load blog posts. See console for details.</p>';
        }
    }

    // Publish Blog Post
    const publishBlogPostBtn = document.getElementById('publish-blog-post-btn');
    if (publishBlogPostBtn) {
        publishBlogPostBtn.addEventListener('click', async () => {
            const title = document.getElementById('blog-post-title').value;
            const author = document.getElementById('blog-post-author').value;
            const tags = document.getElementById('blog-post-tags').value.split(',').map(tag => tag.trim());
            const content = tinymce.get('blog-post-content').getContent();
            const editingId = publishBlogPostBtn.dataset.editingId;

            if (!title.trim() || !content.trim() || !author.trim()) {
                showFeedback('blog-post-feedback', 'Please fill all fields.', true);
                return;
            }

            const postData = {
                title,
                author,
                tags,
                content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                if (editingId) {
                    // Update existing post
                    await db.collection('blogPosts').doc(editingId).update(postData);
                    showFeedback('blog-post-feedback', 'Blog post updated successfully!');
                    publishBlogPostBtn.textContent = 'Publish Blog Post';
                    delete publishBlogPostBtn.dataset.editingId;
                    document.getElementById('blog-form-title').textContent = 'Create New Blog Post';
                } else {
                    // Add new post
                    postData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('blogPosts').add(postData);
                    showFeedback('blog-post-feedback', 'Blog post published successfully!');
                }
                document.getElementById('blog-post-form').reset();
                tinymce.get('blog-post-content').setContent('');
                loadBlogPostsForManagement();
            } catch (error) {
                console.error("Error publishing/updating blog post: ", error);
                showFeedback('blog-post-feedback', 'Failed to publish/update blog post. See console for details.', true);
            }
        });
    }

    async function loadResearchPostsForManagement() {
        const researchPostsListDiv = document.getElementById('research-posts-list');
        if (!researchPostsListDiv) return;

        researchPostsListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400">Loading research posts...</p>';

        try {
            const querySnapshot = await db.collection('researchPosts').orderBy('createdAt', 'desc').get();
            if (querySnapshot.empty) {
                researchPostsListDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400">No research posts found.</p>';
                return;
            }

            let postsHtml = '';
            querySnapshot.forEach(doc => {
                const post = doc.data();
                const postId = doc.id;
                const snippet = post.content.length > 100 ? post.content.substring(0, 100) + '...' : post.content;
                
                postsHtml += `
                    <div class="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:border-gray-700 dark:bg-gray-800" id="research-post-${postId}">
                        <h3 class="text-xl font-semibold text-gray-900 dark:text-white">${post.title}</h3>
                        <p class="text-gray-500 dark:text-gray-400 text-sm mb-2">Published: ${post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Date N/A'}</p>
                        <div class="text-gray-700 dark:text-gray-300 mb-3">${snippet}</div>
                        <button data-id="${postId}" class="edit-research-post-btn px-3 py-1.5 text-sm font-medium text-center text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-800 mr-2">Edit</button>
                        <button data-id="${postId}" class="delete-research-post-btn px-3 py-1.5 text-sm font-medium text-center text-white bg-red-600 rounded-lg hover:bg-red-700 focus:ring-4 focus:ring-red-300 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-900">Delete</button>
                    </div>
                `;
            });
            researchPostsListDiv.innerHTML = postsHtml;

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-research-post-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const postId = e.target.dataset.id;
                    if (confirm('Are you sure you want to delete this research post?')) {
                        try {
                            await db.collection('researchPosts').doc(postId).delete();
                            showFeedback('manage-research-feedback', 'Research post deleted successfully!');
                            loadResearchPostsForManagement(); // Refresh the list
                        } catch (error) {
                            console.error("Error deleting research post: ", error);
                            showFeedback('manage-research-feedback', 'Failed to delete research post. See console for details.', true);
                        }
                    }
                });
            });

            // Add event listeners for edit buttons
            document.querySelectorAll('.edit-research-post-btn').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const postId = e.target.dataset.id;
                    const postDoc = await db.collection('researchPosts').doc(postId).get();
                    if (!postDoc.exists) {
                        showFeedback('manage-research-feedback', 'Research post not found for editing.', true);
                        return;
                    }
                    const postData = postDoc.data();

                    window.scrollTo(0, 0);

                    if (typeof tinymce !== 'undefined') {
                        if (tinymce.get('research-post-content')) {
                            tinymce.get('research-post-content').setContent(postData.content || '');
                        } else {
                            await tinymce.init({
                                selector: '#research-post-content',
                                plugins: 'advlist autolink lists link image charmap print preview hr anchor pagebreak',
                                toolbar_mode: 'floating',
                            });
                            tinymce.get('research-post-content').setContent(postData.content || '');
                        }
                    }
                    
                    document.getElementById('research-post-title').value = postData.title || '';
                    document.getElementById('research-post-author').value = postData.author || '';
                    document.getElementById('research-post-tags').value = postData.tags ? postData.tags.join(', ') : '';

                    const publishBtn = document.getElementById('publish-research-post-btn');
                    publishBtn.textContent = 'Update Research Post';
                    publishBtn.dataset.editingId = postId; // Store ID for update
                    document.getElementById('research-form-title').textContent = 'Edit Research Post';
                });
            });

        } catch (error) {
            console.error("Error loading research posts: ", error);
            researchPostsListDiv.innerHTML = '<p class="text-red-500">Failed to load research posts. See console for details.</p>';
        }
    }

    // Publish Research Post
    const publishResearchPostBtn = document.getElementById('publish-research-post-btn');
    if (publishResearchPostBtn) {
        publishResearchPostBtn.addEventListener('click', async () => {
            const title = document.getElementById('research-post-title').value;
            const author = document.getElementById('research-post-author').value;
            const tags = document.getElementById('research-post-tags').value.split(',').map(tag => tag.trim());
            const content = tinymce.get('research-post-content').getContent();
            const editingId = publishResearchPostBtn.dataset.editingId;

            if (!title.trim() || !content.trim() || !author.trim()) {
                showFeedback('research-post-feedback', 'Please fill all fields.', true);
                return;
            }
            
            const postData = {
                title,
                author,
                tags,
                content,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                if (editingId) {
                    // Update existing post
                    await db.collection('researchPosts').doc(editingId).update(postData);
                    showFeedback('research-post-feedback', 'Research post updated successfully!');
                    publishResearchPostBtn.textContent = 'Publish Research Post';
                    delete publishResearchPostBtn.dataset.editingId;
                    document.getElementById('research-form-title').textContent = 'Create New Research Post';
                } else {
                    // Add new post
                    postData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await db.collection('researchPosts').add(postData);
                    showFeedback('research-post-feedback', 'Research post published successfully!');
                }
                document.getElementById('research-post-form').reset();
                tinymce.get('research-post-content').setContent('');
                loadResearchPostsForManagement();
            } catch (error) {
                console.error("Error publishing/updating research post: ", error);
                showFeedback('research-post-feedback', 'Failed to publish/update research post. See console for details.', true);
            }
        });
    }

    const getMainChartOptions = () => {
        let mainChartColors = {}

        if (document.documentElement.classList.contains('dark')) {
            mainChartColors = {
                borderColor: '#374151',
                labelColor: '#9CA3AF',
                opacityFrom: 0,
                opacityTo: 0.15,
            };
        } else {
            mainChartColors = {
                borderColor: '#F3F4F6',
                labelColor: '#6B7280',
                opacityFrom: 0.45,
                opacityTo: 0,
            }
        }

        return {
            chart: {
                height: 420,
                type: 'area',
                fontFamily: 'Inter, sans-serif',
                foreColor: mainChartColors.labelColor,
                toolbar: {
                    show: false
                }
            },
            fill: {
                type: 'gradient',
                gradient: {
                    enabled: true,
                    opacityFrom: mainChartColors.opacityFrom,
                    opacityTo: mainChartColors.opacityTo
                }
            },
            dataLabels: {
                enabled: false
            },
            tooltip: {
                style: {
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif',
                },
            },
            grid: {
                show: true,
                borderColor: mainChartColors.borderColor,
                strokeDashArray: 1,
                padding: {
                    left: 35,
                    bottom: 15
                }
            },
            series: [
                {
                    name: 'Revenue',
                    data: [6356, 6218, 6156, 6526, 6356, 6256, 6056],
                    color: '#1A56DB'
                },
                {
                    name: 'Revenue (previous period)',
                    data: [6556, 6725, 6424, 6356, 6586, 6756, 6616],
                    color: '#FDBA8C'
                }
            ],
            markers: {
                size: 5,
                strokeColors: '#ffffff',
                hover: {
                    size: undefined,
                    sizeOffset: 3
                }
            },
            xaxis: {
                categories: ['01 Feb', '02 Feb', '03 Feb', '04 Feb', '05 Feb', '06 Feb', '07 Feb'],
                labels: {
                    style: {
                        colors: [mainChartColors.labelColor],
                        fontSize: '14px',
                        fontWeight: 500,
                    },
                },
                axisBorder: {
                    color: mainChartColors.borderColor,
                },
                axisTicks: {
                    color: mainChartColors.borderColor,
                },
                crosshairs: {
                    show: true,
                    position: 'back',
                    stroke: {
                        color: mainChartColors.borderColor,
                        width: 1,
                        dashArray: 10,
                    },
                },
            },
            yaxis: {
                labels: {
                    style: {
                        colors: [mainChartColors.labelColor],
                        fontSize: '14px',
                        fontWeight: 500,
                    },
                    formatter: function (value) {
                        return '$' + value;
                    }
                },
            },
            legend: {
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                labels: {
                    colors: [mainChartColors.labelColor]
                },
                itemMargin: {
                    horizontal: 10
                }
            },
            responsive: [
                {
                    breakpoint: 1024,
                    options: {
                        xaxis: {
                            labels: {
                                show: false
                            }
                        }
                    }
                }
            ]
        };
    }

    if (document.getElementById('main-chart')) {
        const chart = new ApexCharts(document.getElementById('main-chart'), getMainChartOptions());
        chart.render();

        // init again when toggling dark mode
        document.addEventListener('dark-mode', function () {
            chart.updateOptions(getMainChartOptions());
        });
    }

    if (document.getElementById('new-products-chart')) {
        const options = {
            colors: ['#1A56DB', '#FDBA8C'],
            series: [
                {
                    name: 'Quantity',
                    color: '#1A56DB',
                    data: [
                        { x: '01 Feb', y: 170 },
                        { x: '02 Feb', y: 180 },
                        { x: '03 Feb', y: 164 },
                        { x: '04 Feb', y: 145 },
                        { x: '05 Feb', y: 194 },
                        { x: '06 Feb', y: 170 },
                        { x: '07 Feb', y: 155 },
                    ]
                }
            ],
            chart: {
                type: 'bar',
                height: '140px',
                fontFamily: 'Inter, sans-serif',
                foreColor: '#4B5563',
                toolbar: {
                    show: false
                }
            },
            plotOptions: {
                bar: {
                    columnWidth: '90%',
                    borderRadius: 3
                }
            },
            tooltip: {
                shared : false,
                intersect: false,
                style: {
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif'
                },
            },
            states: {
                hover: {
                    filter: {
                        type: 'darken',
                        value: 1
                    }
                }
            },
            stroke: {
                show: true,
                width: 5,
                colors: ['transparent']
            },
            grid: {
                show: false
            },
            dataLabels: {
                enabled: false
            },
            legend: {
                show: false
            },
            xaxis: {
                floating: false,
                labels: {
                    show: false
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                },
            },
            yaxis: {
                show: false
            },
            fill: {
                opacity: 1
            }
        };

        const chart = new ApexCharts(document.getElementById('new-products-chart'), options);
        chart.render();
    }

    if (document.getElementById('sales-by-category')) {
        const options = {
            colors: ['#1A56DB', '#FDBA8C'],
            series: [
                {
                    name: 'Desktop PC',
                    color: '#1A56DB',
                    data: [
                        { x: '01 Feb', y: 170 },
                        { x: '02 Feb', y: 180 },
                        { x: '03 Feb', y: 164 },
                        { x: '04 Feb', y: 145 },
                        { x: '05 Feb', y: 194 },
                        { x: '06 Feb', y: 170 },
                        { x: '07 Feb', y: 155 },
                    ]
                },
                {
                    name: 'Phones',
                    color: '#FDBA8C',
                    data: [
                        { x: '01 Feb', y: 120 },
                        { x: '02 Feb', y: 294 },
                        { x: '03 Feb', y: 167 },
                        { x: '04 Feb', y: 179 },
                        { x: '05 Feb', y: 245 },
                        { x: '06 Feb', y: 182 },
                        { x: '07 Feb', y: 143 }
                    ]
                }
            ],
            chart: {
                type: 'bar',
                height: '420px',
                fontFamily: 'Inter, sans-serif',
                foreColor: '#4B5563',
                toolbar: {
                    show: false
                }
            },
            plotOptions: {
                bar: {
                    columnWidth: '50%',
                    borderRadius: 3
                }
            },
            tooltip: {
                shared : true,
                intersect: false,
                style: {
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif'
                },
            },
            states: {
                hover: {
                    filter: {
                        type: 'darken',
                        value: 1
                    }
                }
            },
            stroke: {
                show: true,
                width: 5,
                colors: ['transparent']
            },
            grid: {
                show: false
            },
            dataLabels: {
                enabled: false
            },
            legend: {
                show: false
            },
            xaxis: {
                floating: false,
                labels: {
                    show: false
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                },
            },
            yaxis: {
                show: false
            },
            fill: {
                opacity: 1
            }
        };

        const chart = new ApexCharts(document.getElementById('sales-by-category'), options);
        chart.render();
    }

    const getVisitorsChartOptions = () => {
        let visitorsChartColors = {}

        if (document.documentElement.classList.contains('dark')) {
            visitorsChartColors = {
                fillGradientShade: 'dark',
                fillGradientShadeIntensity: 0.45,
            };
        } else {
            visitorsChartColors = {
                fillGradientShade: 'light',
                fillGradientShadeIntensity: 1,
            }
        }

        return {
            series: [{
                name: 'Visitors',
                data: [500, 590, 600, 520, 610, 550, 600]
            }],
            labels: ['01 Feb', '02 Feb', '03 Feb', '04 Feb', '05 Feb', '06 Feb', '07 Feb'],
            chart: {
                type: 'area',
                height: '305px',
                fontFamily: 'Inter, sans-serif',
                sparkline: {
                    enabled: true
                },
                toolbar: {
                    show: false
                }
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shade: visitorsChartColors.fillGradientShade,
                    shadeIntensity: visitorsChartColors.fillGradientShadeIntensity
                },
            },
            plotOptions: {
                area: {
                    fillTo: 'end'
                }
            },
            theme: {
                monochrome: {
                    enabled: true,
                    color: '#1A56DB',
                }
            },
            tooltip: {
                style: {
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif'
                },
            },
        }
    }

    const getSignupsChartOptions = () => {
        let signupsChartColors = {}

        if (document.documentElement.classList.contains('dark')) {
            signupsChartColors = {
                backgroundBarColors: ['#374151', '#374151', '#374151', '#374151', '#374151', '#374151', '#374151']
            };
        } else {
            signupsChartColors = {
                backgroundBarColors: ['#E5E7EB', '#E5E7EB', '#E5E7EB', '#E5E7EB', '#E5E7EB', '#E5E7EB', '#E5E7EB']
            };
        }

        return {
            series: [{
                name: 'Users',
                data: [1334, 2435, 1753, 1328, 1155, 1632, 1336]
            }],
            labels: ['01 Feb', '02 Feb', '03 Feb', '04 Feb', '05 Feb', '06 Feb', '07 Feb'],
            chart: {
                type: 'bar',
                height: '140px',
                foreColor: '#4B5563',
                fontFamily: 'Inter, sans-serif',
                toolbar: {
                    show: false
                }
            },
            theme: {
                monochrome: {
                    enabled: true,
                    color: '#1A56DB'
                }
            },
            plotOptions: {
                bar: {
                    columnWidth: '25%',
                    borderRadius: 3,
                    colors: {
                        backgroundBarColors: signupsChartColors.backgroundBarColors,
                        backgroundBarRadius: 3
                    },
                },
                dataLabels: {
                    hideOverflowingLabels: false
                }
            },
            xaxis: {
                floating: false,
                labels: {
                    show: false
                },
                axisBorder: {
                    show: false
                },
                axisTicks: {
                    show: false
                },
            },
            tooltip: {
                shared: true,
                intersect: false,
                style: {
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif'
                }
            },
            states: {
                hover: {
                    filter: {
                        type: 'darken',
                        value: 0.8
                    }
                }
            },
            fill: {
                opacity: 1
            },
            yaxis: {
                show: false
            },
            grid: {
                show: false
            },
            dataLabels: {
                enabled: false
            },
            legend: {
                show: false
            },
        };
    }

    if (document.getElementById('week-signups-chart')) {
        const chart = new ApexCharts(document.getElementById('week-signups-chart'), getSignupsChartOptions());
        chart.render();

        // init again when toggling dark mode
        document.addEventListener('dark-mode', function () {
            chart.updateOptions(getSignupsChartOptions());
        });
    }

    const getTrafficChannelsChartOptions = () => {

        let trafficChannelsChartColors = {}

        if (document.documentElement.classList.contains('dark')) {
            trafficChannelsChartColors = {
                strokeColor: '#1f2937'
            };
        } else {
            trafficChannelsChartColors = {
                strokeColor: '#ffffff'
            }
        }

        return {
            series: [70, 5, 25],
            labels: ['Desktop', 'Tablet', 'Phone'],
            colors: ['#16BDCA', '#FDBA8C', '#1A56DB'],
            chart: {
                type: 'donut',
                height: 400,
                fontFamily: 'Inter, sans-serif',
                toolbar: {
                    show: false
                },
            },
            responsive: [{
                breakpoint: 430,
                options: {
                  chart: {
                    height: 300
                  }
                }
            }],
            stroke: {
                colors: [trafficChannelsChartColors.strokeColor]
            },
            states: {
                hover: {
                    filter: {
                        type: 'darken',
                        value: 0.9
                    }
                }
            },
            tooltip: {
                shared: true,
                followCursor: false,
                fillSeriesColor: false,
                inverseOrder: true,
                style: {
                    fontSize: '14px',
                    fontFamily: 'Inter, sans-serif'
                },
                x: {
                    show: true,
                    formatter: function (_, { seriesIndex, w }) {
                        const label = w.config.labels[seriesIndex];
                        return label
                    }
                },
                y: {
                    formatter: function (value) {
                        return value + '%';
                    }
                }
            },
            grid: {
                show: false
            },
            dataLabels: {
                enabled: false
            },
            legend: {
                show: false
            },
        };
    }

    if (document.getElementById('traffic-by-device')) {
        const chart = new ApexCharts(document.getElementById('traffic-by-device'), getTrafficChannelsChartOptions());
        chart.render();

        // init again when toggling dark mode
        document.addEventListener('dark-mode', function () {
            chart.updateOptions(getTrafficChannelsChartOptions());
        });
    }
    const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
    const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

    // Change the icons inside the button based on previous settings
    if (localStorage.getItem('color-theme') === 'dark' || (!('color-theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        themeToggleLightIcon.classList.remove('hidden');
    } else {
        themeToggleDarkIcon.classList.remove('hidden');
    }
    const themeToggleBtn = document.getElementById('theme-toggle');
    let event = new Event('dark-mode');
    themeToggleBtn.addEventListener('click', function() {
        // toggle icons
        themeToggleDarkIcon.classList.toggle('hidden');
        themeToggleLightIcon.classList.toggle('hidden');
        // if set via local storage previously
        if (localStorage.getItem('color-theme')) {
            if (localStorage.getItem('color-theme') === 'light') {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            }

        // if NOT set via local storage previously
        } else {
            if (document.documentElement.classList.contains('dark')) {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('color-theme', 'light');
            } else {
                document.documentElement.classList.add('dark');
                localStorage.setItem('color-theme', 'dark');
            }
        }

        document.dispatchEvent(event);
        
    });
    auth.onAuthStateChanged(async (user) => {
        if (user) {
          try {
            const token = await user.getIdTokenResult(true); // Force refresh to get latest claims
            if (token.claims.admin === true) {
              console.log('Admin access confirmed client-side.');
              // Allow page to load
            } else {
              console.log('User is not an admin. Redirecting to login.');
              window.location.href = '/login?error=forbidden_client';
            }
          } catch (error) {
            console.error('Error checking admin status client-side:', error);
            window.location.href = '/login?error=auth_error_client';
          }
        } else {
          console.log('No user logged in. Redirecting to login.');
          window.location.href = '/login?error=unauthorized_client';
        }
    });

    // Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarMobile = document.getElementById('toggleSidebarMobile');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const toggleSidebarMobileHamburger = document.getElementById('toggleSidebarMobileHamburger');
    const toggleSidebarMobileClose = document.getElementById('toggleSidebarMobileClose');

    const toggleMenu = () => {
      if(sidebar) sidebar.classList.toggle('hidden');
      if(sidebarBackdrop) sidebarBackdrop.classList.toggle('hidden');
      if(toggleSidebarMobileHamburger) toggleSidebarMobileHamburger.classList.toggle('hidden');
      if(toggleSidebarMobileClose) toggleSidebarMobileClose.classList.toggle('hidden');
    };

    if(toggleSidebarMobile) {
        toggleSidebarMobile.addEventListener('click', toggleMenu);
    }
    if(sidebarBackdrop) {
        sidebarBackdrop.addEventListener('click', toggleMenu);
    }
});
