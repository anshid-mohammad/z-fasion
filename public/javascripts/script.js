function addToCart(prodId) {
    $.ajax({
        url: '/add-to-cart/'+prodId,
        method: 'get',
        success: (response) => {
            if (response.status) {
                let count = $('#cart_count').html()
                count = parseInt(count) + 1
                $('#cart_count').html(count)
            }
        }
    })
}



