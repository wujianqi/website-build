const {src, dest, watch, task, series, parallel} = require('gulp');
const path = require('path');
const through2 = require('through2').obj;
const gif = require('gulp-if');
const bro = require('gulp-bro');
const browserSync = require('browser-sync').create();
const sass = require('gulp-dart-sass');
const cssBase64 = require('gulp-css-base64');
const cleanCss = require('gulp-clean-css');
const purgecss = require('gulp-purgecss')
const htmlmin = require('gulp-htmlmin');
const imagemin = require('gulp-imagemin');
const sourcemaps = require('gulp-sourcemaps');
const fileinclude = require('gulp-file-include');
const clean = require('gulp-clean');
const inject = require('gulp-inject');
const rev= require('gulp-rev');
const conf =  require('./webconfig');
const isProd = process.env.NODE_ENV === 'prod';

// 获取注入文件
let scripts, styles;
function addInjectPath(file) {
    const index = conf.entrys.indexOf(file.stem.replace(/(\.|\-).+/g, ''));
    const items = file.extname === '.scss' ? styles : scripts;
    let ip = file.path.replace(file.base, conf.output);

    if(file.extname === '.scss')  ip = ip.replace(/\.scss$/, '.css')
    if(!items[index]) items[index] = [];
    items[index].push(ip);
}

// Html页面编译
function html(done) {
    conf.entrys.forEach(html => {
        const index = conf.entrys.indexOf(html);
        const script = scripts[index];
        const style = styles[index];
        const sources = (script && style) ? script.concat(style).flat() : (script || style || void 0);

        const vfs = src(conf.source +'/**/' + html + '.html') // 模版替换
            .pipe(fileinclude({
                prefix: '<!-- @@',
                suffix: '-->',
                basepath: '@file'
            }));

        if(sources && sources.length > 0) { // 注入文件
            vfs.pipe(inject(src(sources, {read: false}), {
                ignorePath: conf.output,
                addRootSlash:false,
                removeTags:true
            }))
        }
        vfs.pipe(gif(isProd, htmlmin({
            removeComments: true,
            removeEmptyAttributes: true,
            collapseWhitespace: true
        })))
        .pipe(dest(conf.output));
    });
    done();
}

// css合并编译
function css() {    
    styles = new Array(conf.entrys.length);
    return src(conf.source +'/**/@(' + conf.entrys.join('|') + ')*(.*).scss')
        .pipe(gif(isProd && conf.hash, rev()))
        .pipe(through2(function(file, enc, cb){
            addInjectPath(file)
            cb(null, file);
        }))
        .pipe(gif(!isProd, sourcemaps.init()))
        .pipe(sass({
            includePaths: ['node_modules', path.join(__dirname,'/node_modules/bootstrap/scss')],
        }).on('error', sass.logError))
        .pipe(cssBase64({
            baseDir: '../' + conf.images,
            maxWeightResource: 100,
            extensionsAllowed: ['.gif', '.jpg']
        }))
        .pipe(gif(isProd, purgecss({
            content: [conf.source +'/**/*.html']
        })))
        .pipe(gif(!isProd, sourcemaps.write()))
        .pipe(gif(isProd, cleanCss()))
        .pipe(dest(conf.output));
}

// js合并编译
function js() {
    scripts = new Array(conf.entrys.length);
    return src(conf.source +'/**/@(' + conf.entrys.join('|') + ')*(.*).js')
        .pipe(bro({
            transform: [
                [ 'babelify', { presets: [ 'env' ], plugins: [
                    "syntax-dynamic-import",
                    "transform-class-properties"
                ]}],
                [ 'uglifyify', { global: true, sourceMap: !isProd  }]
            ]
        }))
        .pipe(gif(isProd&& conf.hash, rev()))
        .pipe(through2(function(file, enc, cb){
            addInjectPath(file)
            cb(null, file);
        }))        
        .pipe(dest(conf.output));
}

// 图片压缩
function img() {
    return src(conf.source +'/**/*.+(jpg|jpeg|gif|png|svg)')
        .pipe(gif(isProd, imagemin({
            progressive: true
        })))
        .pipe(dest(conf.output));
}

// 复制静态非编译文件
function copy() {
    return src(conf.source + '/**/*.+(' + conf.statics.join('|') + ')')
		.pipe(dest(conf.output))
}

// 清理输出目录
function cls() {
    return src(conf.output + '/*', {read: false})
        .pipe(clean());
}

// WEB服务
function serve() {
    browserSync.init({
        open: true,
        server: conf.output
    });
}
// 重启
function reload(done) {
    browserSync.reload();
    done();
}

//页面编译任务
const compile = series(parallel(css, js), html);

// 监听
function watchFiles(done) {
    watch(conf.source +'/**/*.html', series(html, reload));
    watch(conf.source +'/**/*.scss', series(css, reload));
    watch(conf.source +'/**/*.js', series(js, reload));
    watch(conf.source +'/**/*.+(jpg|jpeg|gif|png|svg)', series(img, reload));
    watch(conf.source +'/**/*.+(' + conf.statics.join('|') + ')', 
        {delay: 3000}, series(copy, reload));
    done();
}

task('default', series(cls, parallel(copy, compile, img)));
task('serve', series(parallel(compile, img), parallel(serve, watchFiles)));
