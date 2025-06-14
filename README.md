# @4az/prettier-plugin-html-erb
A prettier plugin for html erb template files that works with prettier v3.

## PLEASE READ
This library probably won't be developed any further because I no longer work with Ruby on Rails and thus, the ERB templating system. Feel free to make PRs, fork or whatever you want with this library.

# Install
## Node
```bash
npm install --save-dev prettier @4az/prettier-plugin-html-erb @prettier/plugin-ruby
```
```bash
yarn add -D prettier @4az/prettier-plugin-html-erb @prettier/plugin-ruby
```
```bash
pnpm install --save-dev prettier @4az/prettier-plugin-html-erb @prettier/plugin-ruby
```

## Ruby
If you want to install the dependencies globally:
```bash
gem install bundler prettier_print syntax_tree
```

Or if you are using bundler:
```bash
bundler add prettier_print syntax_tree --group="development"
```

If you're having problems, check the repository of [@prettier/plugin-ruby](https://github.com/prettier/plugin-ruby?tab=readme-ov-file#getting-started).

# Use
Add the plugins to your `.prettierrc`:
```json
{
    "plugins": ["@prettier/plugin-ruby", "@4az/prettier-plugin-html-erb"]
}
```

If any file doesn't format, check the output running prettier in the terminal:
```bash
npx prettier ./src/myfile.html.rb
```

# Configuration
This plugin doesn't have any special config. You can configure the ruby formatting using the options of [@prettier/plugin-ruby](https://github.com/prettier/plugin-ruby?tab=readme-ov-file#configuration).

# Roadmap
There are a number of features I want to support:
- [x] Support erb delimiters. Ex: `<%- delimiters -%>`.
- [-] Port library to TypeSript.
- [-] Add a way to ignore sections of code of being formatted.
- [-] Support more ways to format blocks.

# Testing
To run tests:
```
git clone https://github.com/ForAzens/prettier-plugin-html-erb.git
cd prettier-plugin-html-erb
npm install
gem install bundler prettier_print syntax_tree
npm run test
```

# Special thanks
[@davidodenwald](https://github.com/davidodenwald) for his plugin [prettier-plugin-jinja-template](https://github.com/davidodenwald/prettier-plugin-jinja-template) which served as a base for this plugin.

# License
[MIT](https://github.com/ForAzens/prettier-plugin-html-erb/blob/main/LICENSE)
