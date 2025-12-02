/**
 * Reset Tutorial Modal Script
 * 
 * Run this in the browser console while on the TAILOR app to reset the tutorial.
 * Or copy/paste the one-liner below.
 * 
 * ONE-LINER (copy this to browser console):
 * localStorage.removeItem('tailor_tutorial_completed'); location.reload();
 */

// Storage key used by the tutorial modal
const TUTORIAL_STORAGE_KEY = 'tailor_tutorial_completed';

// Check current state
const currentState = localStorage.getItem(TUTORIAL_STORAGE_KEY);
console.log('🎓 Tutorial Status:', currentState ? '✅ Completed' : '❌ Not completed (will show)');

// Remove the completed flag
localStorage.removeItem(TUTORIAL_STORAGE_KEY);
console.log('🔄 Tutorial reset! Refreshing page...');

// Reload to see the tutorial
location.reload();

