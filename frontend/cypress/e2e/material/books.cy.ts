describe('Books Tab', () => {
    beforeEach(() => {
        cy.loginByCognitoApi(
            'material',
            Cypress.env('cognito_username'),
            Cypress.env('cognito_password'),
        );
        cy.visit('/material/books');
    });

    it('should have correct sections', () => {
        cy.contains('Main Recommendations');
        cy.contains('Tactics');
        cy.contains('Endgames');
    });

    it('should have cohort selector', () => {
        cy.getBySel('cohort-selector').should('be.visible');
    });
});
