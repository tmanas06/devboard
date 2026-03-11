// This code is placed in the 'tests' directory to separate test logic from page objects.

package tests;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;

import pages.SignInPage; // Import the Page Object
import io.github.bonigarcia.wdm.WebDriverManager;
/**
 * Test class to execute the Sign-In scenario using the SignInPage POM.
 */
public class SignInTest {

    public static void main(String[] args) {
    	WebDriverManager.chromedriver().setup();
        WebDriver driver = new ChromeDriver();
        
        // 1. Instantiate the Page Object
        SignInPage signInPage = new SignInPage(driver);
        
        // 2. Perform actions using the page object methods
        try {
            // Navigate and setup
            signInPage.navigateToSignIn("https://time-entry-mbb.vercel.app/sign-in");
            
            // Enter email and click continue
            signInPage.enterEmail("demo6@email.com");
            
            // Enter password and sign in
            signInPage.enterPasswordAndSignIn("Fitendra789");
            
            // Optional: Add assertion here to check successful sign-in
            // For now, we'll just wait and close the driver
            Thread.sleep(5000); 

        } catch (Exception e) {
            System.err.println("An error occurred during sign-in test: " + e.getMessage());
        } finally {
            // 3. Clean up
            driver.quit();
        }
    }
}
