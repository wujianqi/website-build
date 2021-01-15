import $ from 'jquery';
//require('bootstrap/transition.js');
//require('bootstrap/collapse.js');
//require('lightbox2');
require('jquery-lazyload');

$("img").lazyload();

$(window).scroll(function () {
    if ($(".navbar").offset().top > 50) {$(".navbar-fixed-top").addClass("top-nav");
    }else {$(".navbar-fixed-top").removeClass("top-nav");}
})