// functions/api/fetch-metadata.js
import { parseHTML } from 'linkedom';

export async function onRequest(context) {
  const { searchParams } = new URL(context.request.url);
  const url = searchParams.get('url');
  if (!url) {
    return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch external URL', status: resp.status }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const html = await resp.text();
    const { document } = parseHTML(html);
    // Title
    let title = document.querySelector('meta[property="og:title"]')?.content || document.title || '';
    // Description
    let description = document.querySelector('meta[property="og:description"]')?.content || document.querySelector('meta[name="description"]')?.content || '';
    // Filter out known login/generic messages
    const genericMessages = [
      'Facebook helps you connect and share with the people in your life',
      'Log in to Facebook',
      'You must log in',
      'Facebook – log in or sign up',
      'See posts, photos and more on Facebook.',
      'Instagram',
      'Log in to Instagram',
      'Sign Up for Twitter',
      'Log in to Twitter',
      'You must log in to continue.',
      'Sign in to your account',
      'Log in to your account',
      'Sign in – Google accounts',
      'Log in – Google accounts',
      'Sign in to continue',
      'Sign in to your account',
      'Log in to continue',
      'Sign in to view',
      'Log in to view',
      'Sign in to Facebook',
      'Sign in to Instagram',
      'Sign in to Twitter',
      'Sign in to LinkedIn',
      'Log in to LinkedIn',
      'Sign in to Pinterest',
      'Log in to Pinterest',
      'Sign in to Reddit',
      'Log in to Reddit',
      'Sign in to TikTok',
      'Log in to TikTok',
      'Sign in to YouTube',
      'Log in to YouTube',
      'Sign in to view this content',
      'Log in to view this content',
      'Sign in to access',
      'Log in to access',
      'Sign in to continue to',
      'Log in to continue to',
      'Sign in to your Google Account',
      'Log in to your Google Account',
      'Sign in to your Microsoft account',
      'Log in to your Microsoft account',
      'Sign in to your Apple ID',
      'Log in to your Apple ID',
      'Sign in to Dropbox',
      'Log in to Dropbox',
      'Sign in to Box',
      'Log in to Box',
      'Sign in to view more',
      'Log in to view more',
      'Sign in to continue reading',
      'Log in to continue reading',
      'Sign in to access this page',
      'Log in to access this page',
      'Sign in to continue with',
      'Log in to continue with',
      'Sign in to your account to continue',
      'Log in to your account to continue',
      'Sign in to your account to view',
      'Log in to your account to view',
      'Sign in to your account to access',
      'Log in to your account to access',
      'Sign in to your account to read',
      'Log in to your account to read',
      'Sign in to your account to see',
      'Log in to your account to see',
      'Sign in to your account to get',
      'Log in to your account to get',
      'Sign in to your account to use',
      'Log in to your account to use',
      'Sign in to your account to join',
      'Log in to your account to join',
      'Sign in to your account to participate',
      'Log in to your account to participate',
      'Sign in to your account to comment',
      'Log in to your account to comment',
      'Sign in to your account to reply',
      'Log in to your account to reply',
      'Sign in to your account to post',
      'Log in to your account to post',
      'Sign in to your account to share',
      'Log in to your account to share',
      'Sign in to your account to like',
      'Log in to your account to like',
      'Sign in to your account to follow',
      'Log in to your account to follow',
      'Sign in to your account to subscribe',
      'Log in to your account to subscribe',
      'Sign in to your account to save',
      'Log in to your account to save',
      'Sign in to your account to download',
      'Log in to your account to download',
      'Sign in to your account to upload',
      'Log in to your account to upload',
      'Sign in to your account to create',
      'Log in to your account to create',
      'Sign in to your account to edit',
      'Log in to your account to edit',
      'Sign in to your account to delete',
      'Log in to your account to delete',
      'Sign in to your account to remove',
      'Log in to your account to remove',
      'Sign in to your account to add',
      'Log in to your account to add',
      'Sign in to your account to manage',
      'Log in to your account to manage',
      'Sign in to your account to change',
      'Log in to your account to change',
      'Sign in to your account to update',
      'Log in to your account to update',
      'Sign in to your account to upgrade',
      'Log in to your account to upgrade',
      'Sign in to your account to view more',
      'Log in to your account to view more',
      'Sign in to your account to continue reading',
      'Log in to your account to continue reading',
      'Sign in to your account to access this page',
      'Log in to your account to access this page',
      'Sign in to your account to continue with',
      'Log in to your account to continue with',
      '- YouTube',
      'Enjoy the videos and music that you love, upload original content and share it all with friends, family and the world on YouTube.'
    ];
    if (
      genericMessages.some(msg => (title && title.includes(msg)) || (description && description.includes(msg)))
    ) {
      title = '';
      description = '';
    }
    // Image
    let imageUrl = document.querySelector('meta[property="og:image"]')?.content || '';
    if (!imageUrl) {
      const favicon = document.querySelector('link[rel="icon"]')?.href || document.querySelector('link[rel="shortcut icon"]')?.href || '';
      if (favicon) imageUrl = new URL(favicon, url).href;
    } else {
      imageUrl = new URL(imageUrl, url).href;
    }
    return new Response(JSON.stringify({
      title: title || '',
      description: description || '',
      imageUrl: imageUrl || ''
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to fetch or parse metadata', details: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 