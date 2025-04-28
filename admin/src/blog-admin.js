import { initializeApp } from 'firebase/app';
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    deleteDoc,
    doc,
    query,
    orderBy,
    Timestamp 
} from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

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
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Rich Text Editor Configuration
let editor = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Rich Text Editor
    editor = new RichTextEditor("#blog-content-editor", {
        height: '400px',
        toolbar: 'full',
        plugins: ['all_plugins']
    });

    // Check authentication
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = '/admin/content/authentication/sign-in.html';
        }
    });

    // Load existing blog posts
    await loadBlogPosts();

    // Set up form submission
    document.getElementById('blog-form').addEventListener('submit', handleBlogSubmission);
});

async function handleBlogSubmission(e) {
    e.preventDefault();

    const title = document.getElementById('blog-title').value;
    const imageUrl = document.getElementById('blog-image').value;
    const summary = document.getElementById('blog-summary').value;
    const content = editor.getHTMLCode();
    const tags = document.getElementById('blog-tags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

    try {
        const user = auth.currentUser;
        const blogPost = {
            title,
            imageUrl,
            summary,
            content,
            tags,
            author: {
                uid: user.uid,
                name: user.displayName || 'Anonymous',
                photoURL: user.photoURL || '/images/loadeer.svg'
            },
            publishedAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        };

        await addDoc(collection(db, 'blogs'), blogPost);
        
        // Reset form
        e.target.reset();
        editor.setHTMLCode('');
        
        // Refresh blog posts list
        await loadBlogPosts();
        
        alert('Blog post published successfully!');
    } catch (error) {
        console.error('Error publishing blog post:', error);
        alert('Error publishing blog post. Please try again.');
    }
}

async function loadBlogPosts() {
    const blogList = document.getElementById('blog-posts-list');
    blogList.innerHTML = ''; // Clear existing posts

    try {
        const q = query(collection(db, 'blogs'), orderBy('publishedAt', 'desc'));
        const querySnapshot = await getDocs(q);

        querySnapshot.forEach((doc) => {
            const post = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">${post.title}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <img class="h-8 w-8 rounded-full" src="${post.author.photoURL}" alt="">
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900 dark:text-white">${post.author.name}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500 dark:text-gray-300">
                        ${post.publishedAt.toDate().toLocaleDateString()}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <a href="/blog/${doc.id}" class="text-indigo-600 hover:text-indigo-900 dark:hover:text-indigo-400 mr-4">View</a>
                    <button onclick="deleteBlogPost('${doc.id}')" class="text-red-600 hover:text-red-900 dark:hover:text-red-400">Delete</button>
                </td>
            `;
            blogList.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading blog posts:', error);
        alert('Error loading blog posts. Please try again.');
    }
}

// Delete blog post
window.deleteBlogPost = async (postId) => {
    if (!confirm('Are you sure you want to delete this blog post?')) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'blogs', postId));
        await loadBlogPosts(); // Refresh the list
        alert('Blog post deleted successfully!');
    } catch (error) {
        console.error('Error deleting blog post:', error);
        alert('Error deleting blog post. Please try again.');
    }
};