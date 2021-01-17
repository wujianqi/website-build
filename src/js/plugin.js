import $ from 'jquery';

(function(){
    $.fn.test = function(){
        $(this).each(function(){
            $(this).css('color','red');
        });
    }
})()