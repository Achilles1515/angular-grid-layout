import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KtdPlaygroundModule } from './playground/playground.module';
import { KtdCustomHandlesModule } from './custom-handles/custom-handles.module';

const routes: Routes = [
    {
        path: '',
        redirectTo: 'playground',
        pathMatch: 'full'
    },
    {
        path: 'custom-handles',
        redirectTo: 'custom-handles',
        pathMatch: 'full'
    },
    {
        path: '**',
        redirectTo: 'playground'
    },
];

@NgModule({
    imports: [
        KtdPlaygroundModule,
        KtdCustomHandlesModule,
        RouterModule.forRoot(routes, {
        enableTracing: false
    })],
    exports: [RouterModule]
})
export class KtdAppRoutingModule {}


