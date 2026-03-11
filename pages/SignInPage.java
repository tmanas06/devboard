// This code is placed in the 'pages' directory to follow the Page Object Model (POM) structure.

package pages;

import java.time.Duration;
import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;

// Note: Removed unused imports 'java.sql.Driver' as it is not needed for Selenium.

/**
 * Page Object Model (POM) for the Sign-In page.
 * It contains all the locators and methods specific to the sign-in functionality.
 */
public class SignInPage {

    private final WebDriver driver;

    // Locators
    // Using By.id for the email field
    private final By emailField = By.id("identifier-field");
    
    // Using XPath for the 'Continue' button (assuming it's the element with class 'cl-internal-1pnppin')
    private final By continueButton = By.xpath("//div[@class='cl-internal-1pnppin']");
    
    // Using By.id for the password field
    private final By passwordField = By.id("password-field");
    
    // Using XPath for the final 'Sign In' button (assuming it uses the primary localization key)
    private final By signInButton = By.xpath("//button[@data-localization-key='formButtonPrimary']");

    /**
     * Constructor to initialize the WebDriver instance.
     * @param driver The WebDriver instance.
     */
    public SignInPage(WebDriver driver) {
        this.driver = driver;
    }

    /**
     * Navigates to the Sign-In URL and maximizes the window.
     * @param url The URL of the sign-in page.
     */
    public void navigateToSignIn(String url) {
        driver.get(url);
        driver.manage().window().maximize();
        // Implicit wait is usually set once globally, but kept here as an example
        driver.manage().timeouts().implicitlyWait(Duration.ofSeconds(10));
    }

    /**
     * Performs the email entry step.
     * @param email The email address to enter.
     */
    public void enterEmail(String email) {
        driver.findElement(emailField).sendKeys(email);
        driver.findElement(continueButton).click();
    }

    /**
     * Performs the password entry and final sign-in step.
     * @param password The password to enter.
     */
    public void enterPasswordAndSignIn(String password) {
        // Use a small wait for the password field to appear (better to use explicit waits in real code)
        try {
            Thread.sleep(1500); 
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        driver.findElement(passwordField).sendKeys(password);
        driver.findElement(signInButton).click();
    }
    
    // The original main method code is now moved to a separate test class for best practice.
}
