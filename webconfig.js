/**
 * 网站配置
 */
module.exports = {
	source: 'src',
    output: 'dist',
    hash: false, // js/css是否输出-hash后缀
    statics: [ // 同步复制的静态文件类型，不在清单内不处理
        'json','ico','webp','pdf','mp3','mp4','ogg','webm','zip','gz','ttf','eot','woff'
    ],
    entrys: [  // 编译入口主页面（不限目录），嵌入的js/css的前缀需相同
        'index','about'
    ]
}