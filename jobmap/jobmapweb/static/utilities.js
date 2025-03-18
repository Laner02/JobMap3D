// Exportable function that gets the cookie with the name received from the web cookies. Mainly used for the CSRF cookie
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (const element of cookies) {
            const cookie = element.trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Counts the number of elements as received in the array received
function countElement( array, element ) {
    // Filters by the element value, and gets the length of the result array
    return array.filter(
        (item) => item == element).length; 
}