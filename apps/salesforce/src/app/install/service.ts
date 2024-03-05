export const registerOrganisation = async (
    {
        organisationId,
        region,
        domain,
    }
    ) => {
    
    await fetch(`${domain}/?organisation_id=${organisationId}&region=${region}`)
    return 'success'
}