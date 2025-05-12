// Type definitions for Safari-specific browser features

interface Navigator {
  /**
   * Safari on iOS specific property that indicates if the web app was launched from the home screen
   */
  standalone?: boolean;
}